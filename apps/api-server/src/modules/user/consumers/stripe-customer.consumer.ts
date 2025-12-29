import { Process, Processor } from '@nestjs/bull';
import { InjectSentry, SentryService } from '@app/observability';
import { Job } from 'bull';
import { StripeService } from '@app/stripe';
import { UserRepository } from '../repositories/user.repository';
import { DeviceRepository } from '../repositories/device.repository';
import { DeviceService } from '../services/device/device.service';
import { BullQueues, BullWorkers, OperatingSystem } from '../../../shared/utils/constants';

interface CreateStripeCustomerJobData {
  user_id: string;
  email: string;
  auth0_id: string;
}

@Processor(BullQueues.STRIPE_CUSTOMER)
export class StripeCustomerConsumer {
  constructor(
    @InjectSentry() private readonly sentryService: SentryService,
    private readonly stripeService: StripeService,
    private readonly userRepository: UserRepository,
    private readonly deviceRepository: DeviceRepository,
    private readonly deviceService: DeviceService,
  ) {}

  @Process(BullWorkers.CREATE_STRIPE_CUSTOMER)
  async createStripeCustomer(job: Job<CreateStripeCustomerJobData>) {
    const { user_id, email, auth0_id } = job.data;

    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Processing Stripe customer creation job',
        data: { user_id, email, auth0_id },
      });

      // Fetch user to check if they already have a Stripe ID
      const user = await this.userRepository.orm.findOneBy({ id: user_id });
      if (!user) {
        this.sentryService.instance().captureMessage('User not found in Stripe customer creation job', {
          level: 'warning',
          extra: { user_id, email },
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
        await this.userRepository.update(user_id, { stripe_customer_id: stripeId });
        this.sentryService.instance().addBreadcrumb({
          category: 'Service',
          level: 'info',
          message: 'Found existing Stripe customer, updated user record',
          data: { user_id, stripe_customer_id: stripeId },
        });
        return;
      }

      // No customer exists, create one with trial subscription
      const devicesFromDb = await this.deviceRepository.orm.find({
        where: { user_id },
        order: { created_at: 'ASC' },
      });

      const os = (devicesFromDb?.[0]?.operating_system ?? OperatingSystem.Unknown) as OperatingSystem;

      if (os === OperatingSystem.Unknown) {
        this.sentryService.instance().captureEvent({
          message: 'OS not found during background Stripe customer creation',
          level: 'warning',
          extra: { auth0_id, email, user_id },
        });
      }

      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Creating new Stripe customer with trial',
        data: { email, os },
      });

      const stripeCustomer = await this.stripeService.registerNewCustomer(email, os);
      stripeId = stripeCustomer.id;

      // Update user with the new Stripe customer ID
      await this.userRepository.update(user_id, { stripe_customer_id: stripeId });

      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'info',
        message: 'Successfully created Stripe customer in background',
        data: { user_id, stripe_customer_id: stripeId },
      });
    } catch (error) {
      console.error('Error in Stripe customer creation job:', { error, user_id, email });
      this.sentryService.instance().captureException(error, {
        level: 'error',
        extra: { user_id, email, auth0_id },
      });
      throw error; // Re-throw to trigger Bull retry mechanism
    }
  }
}
