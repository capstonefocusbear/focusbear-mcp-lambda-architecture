import { Process, Processor } from '@nestjs/bull';
import { InjectSentry, SentryService } from '@app/observability';
import { Job } from 'bull';
import { Injectable, Inject } from '@nestjs/common';
import { SendGridService } from '@app/send-grid';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  BullQueues,
  BullWorkers,
  EMAIL_SENDER_NAME,
  EMAIL_TEMPLATE_IDS,
  FOCUS_BEAR_EMAILS,
} from '../../../shared/utils/constants';

export interface PasswordResetEmailJobData {
  email: string;
  auth0_id: string;
  user_name: string;
  origin: string;
}

@Processor(BullQueues.PASSWORD_RESET_EMAIL)
@Injectable()
export class PasswordResetEmailConsumer {
  constructor(
    @InjectSentry() private readonly sentryService: SentryService,
    private readonly emailService: SendGridService,
    private readonly configService: ConfigService,
    @Inject('ResetPasswordJwtService')
    private readonly passwordResetJwtService: JwtService,
  ) {}

  @Process(BullWorkers.SEND_PASSWORD_RESET_EMAIL)
  async processPasswordResetEmail(job: Job<PasswordResetEmailJobData>) {
    const { email, auth0_id, user_name, origin } = job.data;

    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Processing password reset email background job',
        data: {
          email,
          job_id: job.id?.toString(),
          attempts: job.attemptsMade?.toString(),
        },
      });

      // Generate reset token
      const secret = this.configService.get('tokens.password_reset.secret');
      const expiresIn = this.configService.get('tokens.password_reset.signOptions.expiresIn') || '1 hour';

      const resetToken = await this.passwordResetJwtService.signAsync(
        {
          email,
          auth0_id,
        },
        {
          secret,
          expiresIn,
        },
      );

      // Build reset link
      const baseUrl = this.getFrontendBaseUrl(origin);
      const resetLink = `${baseUrl}/reset-password?token=${resetToken}`;

      // Send email
      await this.emailService.sendEmail({
        to: email,
        from: {
          name: EMAIL_SENDER_NAME,
          email: FOCUS_BEAR_EMAILS.NOREPLY,
        },
        templateId: EMAIL_TEMPLATE_IDS.REQUEST_PASSWORD_RESET,
        dynamicTemplateData: {
          user_name,
          reset_link: resetLink,
        },
      });

      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Password reset email job processed successfully',
        data: { email },
      });

      return { data: 'Password reset email sent.', status: 200 };
    } catch (error) {
      this.sentryService.instance().captureException(error, {
        level: 'error',
        tags: { job_id: job.id?.toString() },
        extra: { email, job_data: job.data },
      });
      throw error;
    }
  }

  private getFrontendBaseUrl(origin: string) {
    const devFrontendUrl = this.configService.get('server.devFrontendUrl');
    return origin === devFrontendUrl ? devFrontendUrl : this.configService.get('server.frontEndUrl');
  }
}
