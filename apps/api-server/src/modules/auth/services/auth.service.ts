import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { Auth0AuthenticationService, Auth0ManagementService } from '@app/auth0';
import { Passport } from '../domain/passport.model';
import { UserRepository } from '../../user/repositories/user.repository';
import { EmailConfirmationForGuestDto } from '../dto/email-confirmation-guest.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly auth0AuthService: Auth0AuthenticationService,
    @InjectSentry() private readonly sentryService: SentryService,
    private readonly auth0ManagementService: Auth0ManagementService,
    private readonly userRepository: UserRepository,
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

  async requestPasswordReset(email: string) {
    return this.auth0ManagementService.initiatePasswordReset(email);
  }

  async resendEmailVerification(userId: string) {
    const user = await this.userRepository.orm.findOneBy({ id: userId });
    if (!user) throw new NotFoundException(`User with id: ${userId} does not exist!`);
    const auth0User = await this.auth0ManagementService.getAuth0User(user.auth0_id);
    if (auth0User.email_verified) {
      return;
    }
    await this.auth0ManagementService.resendEmailVerification(user.auth0_id);
  }

  async emailConfirmationForGuest({ email }: EmailConfirmationForGuestDto) {
    const [foundUser] = await this.auth0ManagementService.getAuth0UsersWithEmail(email);

    if (!foundUser || foundUser.email !== email) {
      throw new NotFoundException(`User with email: ${email} does not exist!`);
    }

    let response = { data: 'Email is already verified.', status: 200 };
    if (!foundUser.email_verified) {
      await this.auth0ManagementService.resendEmailVerification(foundUser.user_id);
      response = { data: 'Verification email sent.', status: 200 };
    }
    return response;
  }
}
