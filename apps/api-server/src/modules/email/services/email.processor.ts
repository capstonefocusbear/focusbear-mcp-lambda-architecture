import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Injectable, Logger } from '@nestjs/common';
import { InjectSentry, SentryService } from '@app/observability';
import { SendGridService } from '@app/send-grid';
import { FEATURE_FLAGS } from '@api-server/shared/utils/constants';
import { ProgressEmailTemplateService } from './progress-email-template/progress-email-template.service';
import { UserRepository } from '../../user/repositories/user.repository';
import { EmailFrequency } from '../../user/entities/user.entity';

@Processor('emailQueue')
@Injectable()
export class EmailProcessor {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(
    private readonly sendGridService: SendGridService,
    private readonly progressEmailTemplateService: ProgressEmailTemplateService,
    private readonly userRepository: UserRepository,
    @InjectSentry() private readonly sentryService: SentryService,
  ) {}

  @Process('sendEmail')
  public async handleSendEmail(job: Job) {
    const { to, from, replyTo, subject, text } = job.data;

    await this.sendGridService.sendEmail({
      to,
      from,
      replyTo,
      subject,
      text,
    });
  }

  @Process('send-progress-email')
  async handleProgressEmail(job: Job) {
    try {
      const { user, metrics, unsubscribe_token, emailType } = job.data;
      const settings = await this.getUserEmailSettings(user.id);

      // Safety check: skip if user is currently unsubscribed
      if (settings?.email_frequency === EmailFrequency.UNSUBSCRIBED) {
        this.logger.log(`Skipped progress email for user ${user.id}: unsubscribed`);
        return { success: true, userId: user.id, skipped: 'unsubscribed' };
      }
      const variant = emailType === 'daily' ? 'daily' : 'weekly';

      if (variant === 'weekly' && !settings?.feature_flags?.includes(FEATURE_FLAGS.WEEKLY_EMAILS)) {
        this.logger.log(`Skipped weekly progress email for user ${user.id}: feature flag not enabled`);
        return { success: true, userId: user.id, skipped: 'feature_flag_not_enabled' };
      }

      const fromEmail = 'support@focusbear.io';
      const replyToEmail = fromEmail;

      // Generate email content
      const emailContent = await this.progressEmailTemplateService.generateWeeklyProgressEmail(
        user,
        metrics,
        unsubscribe_token,
        { variant },
      );

      // Send email via SendGrid
      await this.sendGridService.sendEmail({
        to: user.email,
        from: fromEmail,
        replyTo: replyToEmail,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
        trackingSettings: {
          clickTracking: { enable: true },
          openTracking: { enable: true },
        },
      });

      // Update last email sent timestamp
      await this.updateLastEmailSent(user.id);

      return { success: true, userId: user.id };
    } catch (error) {
      // Log to Sentry
      this.sentryService.instance().captureException(error, {
        extra: {
          jobId: job.id,
          userId: job.data.user?.id,
          operation: 'handleProgressEmail',
        },
      });

      throw error;
    }
  }

  @Process('send-monthly-progress-email')
  async handleMonthlyProgressEmail(job: Job) {
    try {
      const { user, metrics, unsubscribe_token } = job.data;
      // Safety check: skip if user is currently unsubscribed
      if (await this.isUserUnsubscribed(user.id)) {
        this.sentryService.instance().captureMessage('Skipped sending monthly progress email: user unsubscribed', {
          level: 'info',
          extra: { jobId: job.id, userId: user.id },
          tags: { email_action: 'skip_unsubscribed' },
        });
        return { success: true, userId: user.id, skipped: 'unsubscribed' };
      }
      const fromEmail = 'support@focusbear.io';
      const replyToEmail = fromEmail;

      // Generate email content using monthly template
      const emailContent = await this.progressEmailTemplateService.generateMonthlyProgressEmail(
        user,
        metrics,
        unsubscribe_token,
      );

      // Send email via SendGrid
      await this.sendGridService.sendEmail({
        to: user.email,
        from: fromEmail,
        replyTo: replyToEmail,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
        trackingSettings: {
          clickTracking: { enable: true },
          openTracking: { enable: true },
        },
      });

      // Update last email sent timestamp
      await this.updateLastEmailSent(user.id);

      return { success: true, userId: user.id };
    } catch (error) {
      // Log to Sentry
      this.sentryService.instance().captureException(error, {
        extra: {
          jobId: job.id,
          userId: job.data.user?.id,
          operation: 'handleMonthlyProgressEmail',
        },
      });

      throw error;
    }
  }

  @Process('send-no-progress-email')
  async handleNoProgressEmail(job: Job) {
    try {
      const { user, unsubscribe_token } = job.data;
      const settings = await this.getUserEmailSettings(user.id);

      // Safety check: skip if user is currently unsubscribed
      if (settings?.email_frequency === EmailFrequency.UNSUBSCRIBED) {
        this.sentryService.instance().captureMessage('Skipped sending no-progress email: user unsubscribed', {
          level: 'info',
          extra: { jobId: job.id, userId: user.id },
          tags: { email_action: 'skip_unsubscribed' },
        });
        return { success: true, userId: user.id, skipped: 'unsubscribed' };
      }

      if (!settings?.feature_flags?.includes('no_progress_emails')) {
        this.sentryService.instance().captureMessage('Skipped sending no-progress email: feature flag not enabled', {
          level: 'info',
          extra: { jobId: job.id, userId: user.id },
          tags: { email_action: 'skip_feature_flag' },
        });
        return { success: true, userId: user.id, skipped: 'feature_flag_not_enabled' };
      }
      const fromEmail = 'support@focusbear.io';
      const replyToEmail = fromEmail;

      // Generate email content
      const emailContent = await this.progressEmailTemplateService.generateNoProgressEmail(user, unsubscribe_token);

      // Send email via SendGrid
      await this.sendGridService.sendEmail({
        to: user.email,
        from: fromEmail,
        replyTo: replyToEmail,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      });

      // Update last email sent timestamp
      await this.updateLastEmailSent(user.id);

      return { success: true, userId: user.id };
    } catch (error) {
      // Log to Sentry
      this.sentryService.instance().captureException(error, {
        extra: {
          jobId: job.id,
          userId: job.data.user?.id,
          operation: 'handleNoProgressEmail',
        },
      });

      throw error;
    }
  }

  private async updateLastEmailSent(userId: string): Promise<void> {
    try {
      const user = await this.userRepository.orm.findOne({ where: { id: userId } });
      if (user) {
        const updatedMetadata = {
          ...user.metadata,
          last_email_sent: new Date(),
        };
        await this.userRepository.update(userId, { metadata: updatedMetadata });
      }
    } catch (error) {
      this.sentryService.instance().captureException(error, {
        extra: { operation: 'updateLastEmailSent', userId },
        level: 'warning',
      });
    }
  }

  private async isUserUnsubscribed(userId: string): Promise<boolean> {
    try {
      const record = await this.userRepository.orm.findOne({ where: { id: userId } });
      return record?.email_frequency === EmailFrequency.UNSUBSCRIBED;
    } catch (error) {
      // If we cannot determine, be safe and do not block sending; log for visibility
      this.sentryService.instance().captureException(error, {
        extra: { operation: 'isUserUnsubscribed', userId },
        level: 'warning',
      });
      return false;
    }
  }

  private async getUserEmailSettings(
    userId: string,
  ): Promise<{ email_frequency?: EmailFrequency; feature_flags?: string[] } | null> {
    try {
      return await this.userRepository.orm.findOne({
        where: { id: userId },
        select: ['id', 'email_frequency', 'feature_flags'],
      });
    } catch (error) {
      this.sentryService.instance().captureException(error, {
        extra: { operation: 'getUserEmailSettings', userId },
        level: 'warning',
      });
      return null;
    }
  }
}
