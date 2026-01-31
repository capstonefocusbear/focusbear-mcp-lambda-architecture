import { Process, Processor } from '@nestjs/bull';
import { InjectSentry, SentryService } from '@app/observability';
import { Job } from 'bull';
import { StripeService } from '@app/stripe';
import { Logger } from '@nestjs/common';
import { IsNull } from 'typeorm';
import { UserRepository } from '../repositories/user.repository';
import { DeviceRepository } from '../../device/repositories/device.repository';
import { BullQueues, BullWorkers } from '../../../shared/utils/constants';
import { OperatingSystem } from '../../../shared/domain/operating-system.enum';

interface CreateStripeCustomerJobData {
  user_id: string;
  email: string;
  operating_system?: OperatingSystem;
}

@Processor(BullQueues.STRIPE_CUSTOMER)
export class StripeCustomerConsumer {
  private readonly logger = new Logger(StripeCustomerConsumer.name);

  constructor(
    @InjectSentry() private readonly sentryService: SentryService,
    private readonly stripeService: StripeService,
    private readonly userRepository: UserRepository,
    private readonly deviceRepository: DeviceRepository,
  ) {}

  @Process(BullWorkers.CREATE_STRIPE_CUSTOMER)
  async createStripeCustomer(job: Job<CreateStripeCustomerJobData>) {
    const { user_id, email, operating_system } = job.data;
    const emailDomain = email?.includes('@') ? email.split('@')[1] : undefined;

    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Processing Stripe customer creation job',
        data: { user_id, email_domain: emailDomain },
      });

      // Fetch user to check if they already have a Stripe ID
      const user = await this.userRepository.orm.findOneBy({ id: user_id });
      if (!user) {
        this.sentryService.instance().captureMessage('User not found in Stripe customer creation job', {
          level: 'warning',
          extra: { user_id, email_domain: emailDomain },
        });
        return;
      }

      // Skip if user already has a Stripe customer ID
      if (user.stripe_customer_id) {
        this.sentryService.instance().addBreadcrumb({
          category: 'Service',
          level: 'debug',
          message: 'User already has Stripe customer ID, skipping',
          data: { user_id, stripe_customer_id: user.stripe_customer_id },
        });
        return;
      }

      // Check if a Stripe customer already exists for this email
      let stripeId = await this.stripeService.getStripeCustomerId(email);

      // If customer exists in Stripe but not in our DB, just update our record
      if (stripeId) {
        const alreadyLinkedUser = await this.userRepository.orm.findOneBy({ stripe_customer_id: stripeId });
        if (alreadyLinkedUser && alreadyLinkedUser.id !== user_id) {
          this.sentryService.instance().captureMessage('Stripe customer ID already linked to another user', {
            level: 'warning',
            extra: { user_id, stripe_customer_id: stripeId, already_linked_user_id: alreadyLinkedUser.id },
          });
          return;
        }

        const updateResult = await this.userRepository.orm.update(
          { id: user_id, stripe_customer_id: IsNull() },
          { stripe_customer_id: stripeId },
        );
        if (!updateResult.affected) {
          return;
        }

        this.sentryService.instance().addBreadcrumb({
          category: 'Service',
          level: 'info',
          message: 'Found existing Stripe customer, updated user record',
          data: { user_id, stripe_customer_id: stripeId },
        });
        return;
      }

      // No customer exists, create one
      let os = operating_system ?? OperatingSystem.Unknown;
      if (os === OperatingSystem.Unknown) {
        const devicesFromDb = await this.deviceRepository.orm.find({
          where: { user_id },
          order: { created_at: 'ASC' },
        });
        os = (devicesFromDb?.[0]?.operating_system ?? OperatingSystem.Unknown) as OperatingSystem;
      }

      if (os === OperatingSystem.Unknown) {
        this.sentryService.instance().captureEvent({
          message: 'OS not found during background Stripe customer creation',
          level: 'warning',
          extra: { user_id, email_domain: emailDomain },
        });
      }

      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Creating new Stripe customer',
        data: { user_id, os },
      });

      const stripeCustomer = await this.stripeService.registerNewCustomer(email, os, {
        idempotencyKey: `stripe-customer-create:${user_id}`,
        metadata: { user_id },
      });
      stripeId = stripeCustomer.id;

      // Update user with the new Stripe customer ID
      const updateResult = await this.userRepository.orm.update(
        { id: user_id, stripe_customer_id: IsNull() },
        { stripe_customer_id: stripeId },
      );
      if (!updateResult.affected) {
        const currentUser = await this.userRepository.orm.findOneBy({ id: user_id });
        if (!currentUser?.stripe_customer_id || currentUser.stripe_customer_id !== stripeId) {
          try {
            await this.stripeService.deleteStripeCustomer(stripeId);
          } catch (deleteError) {
            this.sentryService.instance().captureException(deleteError, {
              level: 'warning',
              extra: { user_id, stripe_customer_id: stripeId },
            });
          }
        }
        return;
      }

      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'info',
        message: 'Successfully created Stripe customer in background',
        data: { user_id, stripe_customer_id: stripeId },
      });
    } catch (error) {
      this.logger.error('Error in Stripe customer creation job', error instanceof Error ? error.stack : undefined);
      this.sentryService.instance().captureException(error, {
        level: 'error',
        extra: { user_id, email_domain: emailDomain },
      });
      throw error; // Re-throw to trigger Bull retry mechanism
    }
  }
}
