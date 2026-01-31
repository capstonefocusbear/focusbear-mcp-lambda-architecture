import {
  BadRequestException,
  HttpStatus,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectSentry, SentryService } from '@app/observability';
import { Auth0AuthenticationService, Auth0ManagementService } from '@app/auth0';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { I18nService } from 'nestjs-i18n';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { AUTH0_RETRY_CONFIG, BullQueues, BullWorkers } from '../../../shared/utils/constants';
import { SendEmailVerificationDto } from '../dto/send-email-verification.dto';
import { EmailConfirmationForGuestDto } from '../dto/email-confirmation-guest.dto';
import { UserRepository } from '../../user/repositories/user.repository';
import { Passport } from '../domain/passport.model';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { ResetPasswordDto } from '../dto/password-reset.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly auth0AuthService: Auth0AuthenticationService,
    @InjectSentry() private readonly sentryService: SentryService,
    private readonly auth0ManagementService: Auth0ManagementService,
    private readonly userRepository: UserRepository,
    private readonly configService: ConfigService,
    private readonly i18nService: I18nService,
    @Inject('EmailVerificationJwtService')
    private readonly emailJwtService: JwtService,
    @Inject('ResetPasswordJwtService')
    private readonly passwordResetJwtService: JwtService,
    @InjectQueue(BullQueues.EMAIL_VERIFICATION)
    private readonly emailVerificationQueue: Queue,
    @InjectQueue(BullQueues.PASSWORD_RESET_EMAIL)
    private readonly passwordResetEmailQueue: Queue,
  ) {}

  async authenticate({ authorization }: { authorization: string }): Promise<Passport> {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Authenticating user',
      });
      const token: string = this.extractBearerToken(authorization);
      const [isAuth, { payload, declineReason }] = await this.auth0AuthService.validateAccessToken(token);
      if (!isAuth) return new Passport({ declineReason });
      const { user } = this.extractCustomTokenClaim(payload);
      const passport = new Passport({ isAuth, user });
      return passport;
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  private extractBearerToken(authHeader: string): string | undefined {
    this.sentryService.instance().addBreadcrumb({
      category: 'Service',
      level: 'debug',
      message: 'Extracting bearer token',
    });
    if (!authHeader) return undefined;
    const [, token] = authHeader.split(' ');
    return token;
  }

  /**
   * Custom claims of Auth0 access token is URL format always.
   * By convention, [domain]/[keyName], keyName is always the last one after "/".
   * This method finds all custom token claims.
   * Converts URL-like keys into usual object keys and return them.
   */
  private extractCustomTokenClaim(payload: string): any {
    this.sentryService.instance().addBreadcrumb({
      category: 'Service',
      level: 'debug',
      message: 'Extracting custom token claim',
      data: {
        payload,
      },
    });
    const payloadEntries = Object.entries(payload);
    const isCustomClaim = ([key, ,]) => key.startsWith('http://') || key.startsWith('https://');
    const customClaims = payloadEntries.filter(isCustomClaim);
    const parseCustomClaim = ([key, value]) => [key.split('/').pop(), value];
    const parsedCustomClaimsEntries = customClaims.map(parseCustomClaim);
    const parsedCustomClaims = Object.fromEntries(parsedCustomClaimsEntries);
    return parsedCustomClaims;
  }

  async requestPasswordReset({ email, lang }: ResetPasswordDto, origin?: string) {
    try {
      const [auth0User] = await this.auth0ManagementService.getAuth0UsersWithEmail(email);
      if (!auth0User) {
        this.sentryService.instance().addBreadcrumb({
          category: 'Service',
          level: 'info',
          message: 'Password reset requested for non-existent user (not enqueued)',
        });
        return { data: 'Password reset email queued.', status: 202 };
      }

      if (!auth0User.email_verified) {
        this.sentryService.instance().addBreadcrumb({
          category: 'Service',
          level: 'info',
          message: 'Password reset requested for unverified email (not enqueued)',
          data: { auth0_id: auth0User.user_id },
        });
        return { data: 'Password reset email queued.', status: 202 };
      }

      const isThirdPartyUser = auth0User.identities?.some((identity) => identity.isSocial) ?? false;
      if (isThirdPartyUser) {
        this.sentryService.instance().addBreadcrumb({
          category: 'Service',
          level: 'info',
          message: 'Password reset requested for third-party user (not enqueued)',
          data: { auth0_id: auth0User.user_id },
        });
        return { data: 'Password reset email queued.', status: 202 };
      }

      const user_name =
        auth0User.name ||
        auth0User.given_name ||
        auth0User.nickname ||
        this.i18nService.t('common.user_name_fallback', { lang });

      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Enqueuing password reset email job',
        data: { email, auth0_id: auth0User.user_id },
      });

      await this.passwordResetEmailQueue.add(
        BullWorkers.SEND_PASSWORD_RESET_EMAIL,
        {
          email,
          auth0_id: auth0User.user_id,
          user_name,
          origin,
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: 10,
          removeOnFail: 5,
        },
      );

      return { data: 'Password reset email queued.', status: 202 };
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async changePassword({ token, newPassword }: ChangePasswordDto) {
    try {
      const secret = this.configService.get('tokens.password_reset.secret');
      const decoded = await this.passwordResetJwtService.verifyAsync(token, { secret });

      const auth0Id = decoded.auth0_id;
      if (!auth0Id) {
        throw new BadRequestException('Invalid token payload');
      }

      await this.auth0ManagementService.updatePassword(auth0Id, newPassword);
      return {
        statusCode: HttpStatus.OK,
        message: 'Password changed successfully',
      };
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Reset token has expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new BadRequestException('Invalid reset token');
      } else {
        throw new InternalServerErrorException('Failed to reset password');
      }
    }
  }

  // Temporary: kept for backward compatibility with older app versions; to be removed in a future release
  async resendEmailVerification(userId: string, origin: string) {
    const user = await this.userRepository.orm.findOneBy({ id: userId });
    if (!user) throw new NotFoundException(`User with id: ${userId} does not exist!`);
    const auth0User = await this.auth0ManagementService.getAuth0User(user.auth0_id);
    return this.sendEmailVerification({ email: auth0User.email }, origin);
  }

  // Temporary: kept for backward compatibility with older app versions; to be removed in a future release
  async emailConfirmationForGuest({ email }: EmailConfirmationForGuestDto, origin: string) {
    const [auth0User] = await this.auth0ManagementService.getAuth0UsersWithEmail(email);

    if (!auth0User) {
      throw new NotFoundException(`User with email: ${email} does not exist!`);
    }
    return this.sendEmailVerification({ email: auth0User.email }, origin);
  }

  async sendEmailVerification(sendEmailVerificationDto: SendEmailVerificationDto, origin: string) {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Enqueuing email verification job',
        data: { ...sendEmailVerificationDto, origin },
      });

      const { email } = sendEmailVerificationDto;

      await this.emailVerificationQueue.add(
        BullWorkers.SEND_EMAIL_VERIFICATION,
        {
          email,
          origin,
        },
        {
          attempts: AUTH0_RETRY_CONFIG.MAX_RETRIES,
          backoff: {
            type: 'exponential',
            delay: AUTH0_RETRY_CONFIG.BASE_DELAY_MS,
          },
          removeOnComplete: 10,
          removeOnFail: 5,
        },
      );

      return { data: 'Email verification queued.', status: 202 };
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async verifyEmail(token: string) {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Verify Email',
        data: { token },
      });

      const secretKey = this.configService.get('tokens.email_verification.secret');
      const decoded: { email: string; auth0_id: string } = await this.emailJwtService.verifyAsync(token, secretKey);

      const auth0User = await this.validateAuth0User(decoded.auth0_id);

      if (auth0User.email_verified) {
        return { message: 'Email is already verified.' };
      }

      return await this.auth0ManagementService.markUserEmailAsVerified(auth0User.user_id, auth0User.email);
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Verification link has expired.');
      } else if (error.name === 'JsonWebTokenError') {
        throw new BadRequestException(
          error.name === 'JsonWebTokenError' ? 'Invalid verification token' : 'Failed to verify email token',
        );
      }
      throw error;
    }
  }

  private async validateAuth0User(auth0_id?: string, email?: string, retryCount = 0) {
    let auth0User = null;

    try {
      if (auth0_id) {
        auth0User = await this.auth0ManagementService.getAuth0User(auth0_id);
      } else {
        const [user] = await this.auth0ManagementService.getAuth0UsersWithEmail(email);
        auth0User = user;
      }

      if (!auth0User) {
        if (retryCount < AUTH0_RETRY_CONFIG.MAX_RETRIES - 1) {
          const delay = AUTH0_RETRY_CONFIG.BASE_DELAY_MS * (retryCount + 1);
          this.sentryService.instance().addBreadcrumb({
            category: 'Auth0 Retry',
            level: 'warning',
            message: `User not found, retrying in ${delay}ms (attempt ${retryCount + 1}/${
              AUTH0_RETRY_CONFIG.MAX_RETRIES
            })`,
            data: auth0_id ? { auth0_id } : { email },
          });
          await new Promise((resolve) => setTimeout(resolve, delay));
          return this.validateAuth0User(auth0_id, email, retryCount + 1);
        }

        throw new NotFoundException(
          auth0_id
            ? `User with auth0_id ${auth0_id} couldn't be found after ${AUTH0_RETRY_CONFIG.MAX_RETRIES} retries`
            : `User with email ${email} couldn't be found after ${AUTH0_RETRY_CONFIG.MAX_RETRIES} retries`,
        );
      }

      return auth0User;
    } catch (error) {
      if (error instanceof NotFoundException && retryCount < AUTH0_RETRY_CONFIG.MAX_RETRIES - 1) {
        const delay = AUTH0_RETRY_CONFIG.BASE_DELAY_MS * (retryCount + 1);
        this.sentryService.instance().addBreadcrumb({
          category: 'Auth0 Retry',
          level: 'warning',
          message: `User not found (from error), retrying in ${delay}ms (attempt ${retryCount + 1}/${
            AUTH0_RETRY_CONFIG.MAX_RETRIES
          })`,
          data: auth0_id ? { auth0_id } : { email },
        });
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.validateAuth0User(auth0_id, email, retryCount + 1);
      }
      throw error;
    }
  }

  private getFrontendBaseUrl(origin: string) {
    const devFrontendUrl = this.configService.get('server.devFrontendUrl');
    return origin === devFrontendUrl ? devFrontendUrl : this.configService.get('server.frontEndUrl');
  }
}
