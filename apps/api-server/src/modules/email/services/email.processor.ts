import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Injectable } from '@nestjs/common';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { SendGridService } from '@app/send-grid';
import { ProgressEmailTemplateService } from './progress-email-template/progress-email-template.service';
import { UserRepository } from '../../user/repositories/user.repository';

@Processor('emailQueue')
@Injectable()
export class EmailProcessor {
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
      const { user, metrics, unsubscribe_token } = job.data;

      // Generate email content
      const emailContent = await this.progressEmailTemplateService.generateWeeklyProgressEmail(
        user,
        metrics,
        unsubscribe_token,
      );

      // Send email via SendGrid
      await this.sendGridService.sendEmail({
        to: user.email,
        from: process.env.SENDGRID_FROM_EMAIL || 'noreply@focusbear.io',
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

  @Process('send-no-progress-email')
  async handleNoProgressEmail(job: Job) {
    try {
      const { user, unsubscribe_token } = job.data;

      // Generate email content
      const emailContent = await this.progressEmailTemplateService.generateNoProgressEmail(user, unsubscribe_token);

      // Send email via SendGrid
      await this.sendGridService.sendEmail({
        to: user.email,
        from: process.env.SENDGRID_FROM_EMAIL || 'noreply@focusbear.io',
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
}
