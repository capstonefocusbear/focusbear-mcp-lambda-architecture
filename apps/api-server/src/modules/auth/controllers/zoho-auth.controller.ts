/* eslint-disable no-console */
import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { ZohoAuthService } from '../services/zoho-auth.service';
import { AuthContext } from '../../../shared/decorators/passport.decorator';
import { Passport } from '../domain/passport.model';
import { IsAuth } from '../guards/is-auth/is-auth.guard';
import { ZohoAuthorizeQuery } from '../dto/zoho-authorize-query.dto';
import { ZohoLoginQuery } from '../dto/zoho-login-query.dto';

@Controller('zoho-auth')
@ApiTags('zoho-auth')
@ApiSecurity('Auth0AccessToken')
export class ZohoAuthController {
  constructor(private readonly zohoAuthService: ZohoAuthService) {}

  @Get('zoho')
  zohoLogin(@Query() { is_development }: ZohoLoginQuery) {
    return this.zohoAuthService.getZohoLoginUrl(is_development);
  }

  @Get('zoho/callback')
  @UseGuards(IsAuth)
  async zohoCallback(@Query() authorizeQuery: ZohoAuthorizeQuery, @AuthContext() { user }: Passport) {
    try {
      return await this.zohoAuthService.authorize(user.id, authorizeQuery);
    } catch (error) {
      console.log(error);
      return error;
    }
  }

  @Get('/refresh-token')
  @UseGuards(IsAuth)
  async refreshToken(@AuthContext() { user }: Passport) {
    try {
      return await this.zohoAuthService.refreshToken(user.id);
    } catch (error) {
      console.log(error);
      return error;
    }
  }
}
