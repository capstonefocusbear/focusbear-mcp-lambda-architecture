import { Process, Processor } from '@nestjs/bull';
import { InjectSentry, SentryService } from '@app/observability';
import { Job } from 'bull';
import { Injectable, Inject } from '@nestjs/common';
import { SendGridService } from '@app/send-grid';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  AUTH0_RETRY_CONFIG,
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
  origin?: string;
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
      const resetToken = await this.passwordResetJwtService.signAsync({
        email,
        auth0_id,
      });

      // Build reset link
      const baseUrl = this.getFrontendBaseUrl(origin);
      const resetLink = `${baseUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;

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
          verification_link: resetLink,
          resetLink,
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
      const isLastAttempt = (job.attemptsMade || 0) + 1 >= (job.opts.attempts ?? AUTH0_RETRY_CONFIG.MAX_RETRIES);

      this.sentryService.instance().captureException(error, {
        level: isLastAttempt ? 'error' : 'warning',
        tags: {
          service: 'auth',
          operation: 'send-password-reset-email',
          job_id: job.id?.toString(),
          attempts: (job.attemptsMade || 0).toString(),
          is_last_attempt: isLastAttempt.toString(),
        },
        extra: { email, job_data: job.data, error_message: error.message },
      });
      throw error;
    }
  }

  private getFrontendBaseUrl(origin?: string): string {
    const devFrontendUrl = this.configService.get<string>('server.devFrontendUrl');
    const frontEndUrl = this.configService.get<string>('server.frontEndUrl');

    if (devFrontendUrl && origin === devFrontendUrl) return devFrontendUrl;
    if (frontEndUrl) return frontEndUrl;

    throw new Error('Missing server.frontEndUrl configuration');
  }
}
