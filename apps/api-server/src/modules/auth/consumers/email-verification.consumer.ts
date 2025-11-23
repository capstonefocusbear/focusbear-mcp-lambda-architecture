import { Process, Processor } from '@nestjs/bull';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { Job } from 'bull';
import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { Auth0ManagementService } from '@app/auth0';
import { SendGridService } from '@app/send-grid';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  AUTH0_RETRY_CONFIG,
  BullQueues,
  BullWorkers,
  EMAIL_SENDER_NAME,
  EMAIL_TEMPLATE_IDS,
  FOCUS_BEAR_EMAILS,
} from '../../../shared/utils/constants';

export interface EmailVerificationJobData {
  email: string;
  origin: string;
}

@Processor(BullQueues.EMAIL_VERIFICATION)
@Injectable()
export class EmailVerificationConsumer {
  constructor(
    @InjectSentry() private readonly sentryService: SentryService,
    private readonly auth0ManagementService: Auth0ManagementService,
    private readonly emailService: SendGridService,
    private readonly configService: ConfigService,
    @Inject('EmailVerificationJwtService')
    private readonly jwtService: JwtService,
  ) {}

  @Process(BullWorkers.SEND_EMAIL_VERIFICATION)
  async processEmailVerification(job: Job<EmailVerificationJobData>) {
    const { email, origin } = job.data;

    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Processing email verification background job',
        data: {
          email,
          job_id: job.id?.toString(),
          attempts: job.attemptsMade?.toString(),
        },
      });

      const auth0User = await this.validateAuth0UserWithRetry(email, job.attemptsMade || 0);

      if (auth0User.email_verified) {
        this.sentryService.instance().addBreadcrumb({
          category: 'Service',
          level: 'info',
          message: 'Email already verified, skipping',
          data: { email },
        });
        return { data: 'Email is already verified.', status: 200 };
      }

      // Generate token
      const secret = this.configService.get('tokens.email_verification.secret');
      const expiresIn = this.configService.get('tokens.email_verification.signOptions.expiresIn') || '7 days';
      const token = await this.jwtService.signAsync(
        {
          email,
          auth0_id: auth0User.user_id,
        },
        {
          secret,
          expiresIn,
        },
      );

      // Send email
      const baseUrl = this.getFrontendBaseUrl(origin);
      const verificationLink = `${baseUrl}/verify-email?token=${token}`;

      await this.emailService.sendEmail({
        to: auth0User.email,
        from: {
          name: EMAIL_SENDER_NAME,
          email: FOCUS_BEAR_EMAILS.NOREPLY,
        },
        templateId: EMAIL_TEMPLATE_IDS.VERIFY_EMAIL,
        dynamicTemplateData: {
          verification_link: verificationLink,
        },
      });

      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Email verification job processed successfully',
        data: { email },
      });

      return { data: 'Verification email sent.', status: 200 };
    } catch (error) {
      const isLastAttempt = (job.attemptsMade || 0) + 1 >= (job.opts.attempts ?? AUTH0_RETRY_CONFIG.MAX_RETRIES);

      this.sentryService.instance().captureException(error, {
        level: isLastAttempt ? 'error' : 'warning',
        tags: {
          service: 'auth',
          operation: 'send-email-verification',
          job_id: job.id?.toString(),
          attempts: (job.attemptsMade || 0).toString(),
          is_last_attempt: isLastAttempt.toString(),
        },
        extra: {
          email,
          error_message: error.message,
        },
      });

      if (error instanceof NotFoundException && !isLastAttempt) {
        throw error;
      }

      throw error;
    }
  }

  private async validateAuth0UserWithRetry(email: string, attemptCount: number) {
    const [user] = await this.auth0ManagementService.getAuth0UsersWithEmail(email);

    if (!user) {
      if (attemptCount < AUTH0_RETRY_CONFIG.MAX_RETRIES - 1) {
        throw new NotFoundException(`User with email ${email} not found (attempt ${attemptCount + 1})`);
      }
      throw new NotFoundException(
        `User with email ${email} couldn't be found after ${AUTH0_RETRY_CONFIG.MAX_RETRIES} retries`,
      );
    }

    return user;
  }

  private getFrontendBaseUrl(origin: string): string {
    const devFrontendUrl = this.configService.get('server.devFrontendUrl');
    return origin === devFrontendUrl ? devFrontendUrl : this.configService.get('server.frontEndUrl');
  }
}
