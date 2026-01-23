import { Controller, Get, UseGuards, Query, Param, Post, Body, Req } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { InjectSentry, SentryService } from '@app/observability';
import { Throttle } from '@nestjs/throttler';
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
import { SendEmailVerificationDto } from '../dto/send-email-verification.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';

@Controller('auth')
@ApiTags('auth')
export class AuthController {
  constructor(
    private readonly authServiceFactory: AuthServiceFactory,
    @InjectSentry() private readonly sentryService: SentryService,
    private readonly authService: AuthService,
  ) {}

  @Throttle({ default: { ttl: 60, limit: 1 } })
  @Post('/reset-password')
  async requestPasswordReset(@Body() resetPasswordDto: ResetPasswordDto, @Req() request: Request) {
    const { origin } = request.headers as { origin?: string };
    return this.authService.requestPasswordReset(resetPasswordDto, origin);
  }

  @Throttle({ default: { ttl: 60, limit: 1 } })
  @Post('change-password')
  async changePassword(@Body() changePasswordDto: ChangePasswordDto) {
    return this.authService.changePassword(changePasswordDto);
  }

  /**
   * @deprecated This endpoint is deprecated and will be removed in future versions.
   * Please use `/send-email-verification` instead.
   */
  @Post('/email-confirmation')
  @ApiSecurity('Auth0AccessToken')
  @UseGuards(IsAuth)
  async resendEmailVerification(@AuthContext() { user }: Passport, @Req() request: Request) {
    const { origin } = request.headers as { origin?: string };
    return this.authService.resendEmailVerification(user.id, origin);
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

  /**
   * @deprecated This endpoint is deprecated and will be removed in future versions.
   * Please use `/send-email-verification` instead.
   */
  @Post('email-confirmation-guest')
  async emailConfirmationForGuest(
    @Body() emailConfirmationForGuestDto: EmailConfirmationForGuestDto,
    @Req() request: Request,
  ) {
    const { origin } = request.headers as { origin?: string };
    return this.authService.emailConfirmationForGuest(emailConfirmationForGuestDto, origin);
  }

  @Throttle({ default: { ttl: 60, limit: 1 } })
  @Post('send-email-verification')
  async sendEmailVerification(@Body() sendEmailVerificationDto: SendEmailVerificationDto, @Req() request: Request) {
    const { origin } = request.headers as { origin?: string };
    return this.authService.sendEmailVerification(sendEmailVerificationDto, origin);
  }

  @Throttle({ default: { ttl: 60, limit: 2 } })
  @Get('verify-email')
  async verifyEmail(@Query('token') token: string) {
    return this.authService.verifyEmail(token);
  }
}
