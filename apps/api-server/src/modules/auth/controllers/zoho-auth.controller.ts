/* eslint-disable no-console */
import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { ZohoAuthService } from '../services/zoho-auth.service';
import { AuthContext } from '../../../shared/decorators/passport.decorator';
import { Passport } from '../domain/passport.model';
import { IsAuth } from '../guards/is-auth/is-auth.guard';
import { ZohoAuthorizeQuery } from '../dto/zoho-authorize-query.dto';

@Controller('zoho-auth')
export class ZohoAuthController {
  constructor(private readonly zohoAuthService: ZohoAuthService) {}

  @Get('zoho')
  zohoLogin() {
    return this.zohoAuthService.getZohoLoginUrl();
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
