import { Controller, Get, UseGuards, Query, Param, Post, Body } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { AuthContext } from '../../../shared/decorators/passport.decorator';
import { Passport } from '../domain/passport.model';
import { IsAuth } from '../guards/is-auth/is-auth.guard';
import { AuthorizeQuery } from '../dto/authorize-query.dto';
import { IntegrationPlatforms } from '../../platform-integrations/domain/integration-platforms.enum';
import { AuthServiceFactory } from '../services/auth.service.factory';
import { IntegrationLoginQuery } from '../dto/integration-login-query.dto';
import { ResetPasswordDto } from '../dto/password-reset.dto';
import { AuthService } from '../services/auth.service';

@Controller('auth')
@ApiTags('auth')
@ApiSecurity('Auth0AccessToken')
export class AuthController {
  constructor(
    private readonly authServiceFactory: AuthServiceFactory,
    @InjectSentry() private readonly sentryService: SentryService,
    private readonly authService: AuthService,
  ) {}

  @Post('/reset-password')
  async requestPasswordReset(@Body() { email }: ResetPasswordDto) {
    return this.authService.requestPasswordReset(email);
  }

  @Get(':platform')
  login(@Param('platform') platform: IntegrationPlatforms, @Query() { is_development }: IntegrationLoginQuery) {
    const service = this.authServiceFactory.get(platform);
    return service.getLoginUrl(is_development);
  }

  @Get(':platform/callback')
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
}
