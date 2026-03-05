import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Auth0ManagementService } from '@app/auth0';
import { isTestEmail } from '@app/send-grid';
import { UserRepository } from '../../../user/repositories/user.repository';
import { EmailTemplateCompilerService } from '../../../email/services/email-template-compiler/email-template-compiler.service';
import { EmailFrequency } from '../../../user/entities/user.entity';
import { isUUID } from '../../../../shared/utils/helpers';

@Injectable()
export class SubscriptionEmailService {
  private readonly logger = new Logger(SubscriptionEmailService.name);

  private readonly FROM_EMAIL = 'support@focusbear.io';

  private readonly DASHBOARD_URL = process.env.DASHBOARD_URL || 'https://app.focusbear.io';

  constructor(
    @InjectQueue('emailQueue') private readonly emailQueue: Queue,
    private readonly userRepository: UserRepository,
    private readonly emailTemplateCompilerService: EmailTemplateCompilerService,
    private readonly auth0ManagementService: Auth0ManagementService,
  ) {}

  /**
   * Enqueues a thank-you email for the user identified by their Focus Bear UUID
   * (the RevenueCat app_user_id after an INITIAL_PURCHASE event).
   *
   * Silently skips if:
   *  - userId is not a valid UUID
   *  - User not found in DB
   *  - User has no email in Auth0
   *  - User email_frequency is UNSUBSCRIBED
   *  - Email address is an internal test address
   */
  async sendThankYouEmail(userId: string): Promise<void> {
    if (!isUUID(userId)) {
      this.logger.log(`sendThankYouEmail: skipping non-UUID app_user_id ${userId}`);
      return;
    }

    let user: { id: string; auth0_id: string; username?: string; email_frequency?: EmailFrequency } | null;
    try {
      user = await this.userRepository.orm.findOne({
        where: { id: userId },
        select: ['id', 'auth0_id', 'username', 'email_frequency'],
      });
    } catch (error) {
      this.logger.error({ userId, error: error.message }, 'sendThankYouEmail: failed to look up user');
      return;
    }

    if (!user) {
      this.logger.log(`sendThankYouEmail: user ${userId} not found, skipping`);
      return;
    }

    if (user.email_frequency === EmailFrequency.UNSUBSCRIBED) {
      this.logger.log(`sendThankYouEmail: user ${userId} is unsubscribed, skipping`);
      return;
    }

    let email: string;
    try {
      const auth0User = await this.auth0ManagementService.getAuth0User(user.auth0_id);
      email = auth0User?.email;
    } catch (error) {
      this.logger.error({ userId, error: error.message }, 'sendThankYouEmail: failed to fetch Auth0 email');
      return;
    }

    if (!email) {
      this.logger.log(`sendThankYouEmail: user ${userId} has no email, skipping`);
      return;
    }

    if (isTestEmail(email)) {
      this.logger.log(`sendThankYouEmail: skipping test account ${userId}`);
      return;
    }

    try {
      const compiled = await this.emailTemplateCompilerService.compileEmailByPath(
        'subscription/thank-you',
        {
          userName: user.username || 'Friend',
          dashboardUrl: this.DASHBOARD_URL,
          headerTitle: 'Welcome to Focus Bear!',
          headerSubtitle: `Thank you for subscribing`,
          footerText: 'You are receiving this email because you subscribed to Focus Bear.',
          unsubscribeText: 'Unsubscribe',
          apiUrl: process.env.API_URL || 'https://api.focusbear.io',
          manageEmailPreferencesLink: `${this.DASHBOARD_URL}/settings/email-preferences`,
          unsubscribeToken: '',
        },
        {
          subject: '🐻 Thank you for subscribing to Focus Bear!',
          title: 'Thank You for Subscribing',
          preview: 'Welcome to Focus Bear — we\'re so glad you\'re here!',
        },
      );

      await this.emailQueue.add(
        'sendEmail',
        {
          to: email,
          from: this.FROM_EMAIL,
          replyTo: this.FROM_EMAIL,
          subject: compiled.subject,
          html: compiled.html,
          text: compiled.text,
        },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: true,
          removeOnFail: false,
        },
      );

      this.logger.log(`sendThankYouEmail: queued thank-you email for user ${userId}`);
    } catch (error) {
      this.logger.error({ userId, error: error.message }, 'sendThankYouEmail: failed to compile or enqueue email');
    }
  }
}
