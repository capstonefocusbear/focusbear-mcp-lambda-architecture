/* eslint-disable no-console */
import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { MondayAuthService } from '../services/monday-auth.service';
import { AuthContext } from '../../../shared/decorators/passport.decorator';
import { Passport } from '../domain/passport.model';
import { IsAuth } from '../guards/is-auth/is-auth.guard';
import { MondayAuthorizeQuery } from '../dto/monday-authorize-query.dto';

@Controller('monday-auth')
@ApiTags('monday-auth')
@ApiSecurity('Auth0AccessToken')
export class MondayAuthController {
  constructor(private readonly mondayAuthService: MondayAuthService) {}

  @Get('monday')
  mondayLogin() {
    return this.mondayAuthService.getMondayLoginUrl();
  }

  @Get('monday/callback')
  @UseGuards(IsAuth)
  async mondayCallback(@Query() authorizeQuery: MondayAuthorizeQuery, @AuthContext() { user }: Passport) {
    try {
      return await this.mondayAuthService.authorize(user.id, authorizeQuery);
    } catch (error) {
      return error;
    }
  }
}
