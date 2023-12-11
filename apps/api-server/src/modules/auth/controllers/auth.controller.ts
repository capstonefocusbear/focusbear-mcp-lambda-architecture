import { Controller, Get, UseGuards, Query, Param } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AuthContext } from '../../../shared/decorators/passport.decorator';
import { Passport } from '../domain/passport.model';
import { IsAuth } from '../guards/is-auth/is-auth.guard';
import { AuthorizeQuery } from '../dto/authorize-query.dto';
import { IntegrationPlatforms } from '../../platform-integrations/domain/integration-platforms.enum';
import { AuthServiceFactory } from '../services/auth.service.factory';

@Controller('auth')
@ApiTags('auth')
@ApiSecurity('Auth0AccessToken')
export class AuthController {
  constructor(private readonly authServiceFactory: AuthServiceFactory) {}

  @Get(':platform')
  login(@Param('platform') platform: IntegrationPlatforms) {
    const service = this.authServiceFactory.get(platform);
    return service.getLoginUrl();
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
      return error;
    }
  }
}
