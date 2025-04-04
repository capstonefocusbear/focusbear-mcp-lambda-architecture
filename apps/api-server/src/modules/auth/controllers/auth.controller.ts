import { Controller, Get, UseGuards, Query, Param, Post, Body } from '@nestjs/common';
import { ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { API_RESPONSE_EMAIL_NOT_VERIFIED, API_RESPONSE_THIRD_PARTY_EMAIL } from '../../../shared/utils/error-constants';
import { AuthContext } from '../../../shared/decorators/passport.decorator';
import { Passport } from '../domain/passport.model';
import { IsAuth } from '../guards/is-auth/is-auth.guard';
import { AuthorizeQuery } from '../dto/authorize-query.dto';
import { IntegrationPlatforms } from '../../platform-integrations/domain/integration-platforms.enum';
import { AuthServiceFactory } from '../services/auth.service.factory';
import { IntegrationLoginQuery } from '../dto/integration-login-query.dto';
import { ResetPasswordDto } from '../dto/password-reset.dto';
import { AuthService } from '../services/auth.service';
import { EmailConfirmationForGuestDto } from '../dto/email-confirmation-guest.dto';

@Controller('auth')
@ApiTags('auth')
export class AuthController {
  constructor(
    private readonly authServiceFactory: AuthServiceFactory,
    @InjectSentry() private readonly sentryService: SentryService,
    private readonly authService: AuthService,
  ) {}

  @Post('/reset-password')
  @ApiResponse(API_RESPONSE_EMAIL_NOT_VERIFIED)
  @ApiResponse(API_RESPONSE_THIRD_PARTY_EMAIL)
  async requestPasswordReset(@Body() { email }: ResetPasswordDto) {
    return this.authService.requestPasswordReset(email);
  }

  @Post('/email-confirmation')
  @ApiSecurity('Auth0AccessToken')
  @UseGuards(IsAuth)
  async resendEmailVerification(@AuthContext() { user }: Passport) {
    return this.authService.resendEmailVerification(user.id);
  }

  @Get(':platform')
  @ApiSecurity('Auth0AccessToken')
  @UseGuards(IsAuth)
  login(@Param('platform') platform: IntegrationPlatforms, @Query() { is_development }: IntegrationLoginQuery) {
    const service = this.authServiceFactory.get(platform);
    return service.getLoginUrl(is_development);
  }

  @Get(':platform/callback')
  @ApiSecurity('Auth0AccessToken')
  @UseGuards(IsAuth)
  async callback(
    @Param('platform') platform: IntegrationPlatforms,
    @Query() authorizeQuery: AuthorizeQuery,
    @AuthContext() { user }: Passport,
  ) {
    try {
      const service = this.authServiceFactory.get(platform);
      return await service.authorize(user.id, authorizeQuery);
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });

      return error;
    }
  }

  // TODO: Implement request-based throttling to prevent abuse of this endpoint.

  /* This endpoint handles email confirmations for non-logged-in users.
  It is triggered during the "forgot password" process when an account is found but the email is unverified.
  The user must verify their email via this endpoint to proceed with resetting their password. */
  @Post('email-confirmation-guest')
  async emailConfirmationForGuest(@Body() emailConfirmationForGuestDto: EmailConfirmationForGuestDto) {
    return this.authService.emailConfirmationForGuest(emailConfirmationForGuestDto);
  }
}
