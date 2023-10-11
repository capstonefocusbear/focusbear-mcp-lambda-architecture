/* eslint-disable no-console */
import { Injectable, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { UserRepository } from '../../user/repositories/user.repository';
import { User } from '../../user/entities/user.entity';
import { MondayAuthorizeQuery } from '../dto/monday-authorize-query.dto';
import { PlatformIntegrationsService } from '../../platform-integrations/services/platform-integrations.service';
import { IntegrationPlatforms } from '../../platform-integrations/domain/integration-platforms.enum';

@Injectable()
export class MondayAuthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService,
    private readonly platformIntegrationsService: PlatformIntegrationsService,
  ) {}

  private mondayClientId = this.configService.get('MONDAY_CLIENT_ID');

  private mondayClientSecret = this.configService.get('MONDAY_CLIENT_SECRET');
  
  private mondayCallbackUrl = this.configService.get('MONDAY_CALLBACK_URL');


  getMondayLoginUrl() {
    return { redirect_url: `https://auth.monday.com/oauth2/authorize?client_id=${this.mondayClientId}&redirect_uri=${this.mondayCallbackUrl}` };
  }

  async saveUserMondayData(
    userId: string,
    data: {
        monday_access_token: string;
        monday_refresh_token: string;
        monday_location: string;
        monday_account_server: string;
    },
  ): Promise<any> {
    const { monday_access_token, monday_refresh_token, monday_location, monday_account_server } = data;
    const existingUser = await this.getUser(userId);
    if (!existingUser) {
      throw new NotFoundException(`User with ID: ${userId} not found!`);
    }
    // Get user MONDAY ID
    const profileUrl = 'https://api.monday.com/v2';
    const headers = { 
        Authorization: monday_access_token,
        'Content-Type': 'application/json'
    };
    const query = "query { me { id } }";
    const response = await axios.post(profileUrl, JSON.stringify({query: query}), { headers });
    const id = response.data.account_id;
    // Save user MONDAY info needed for requests to MONDAY Projects API
    const mondayData = {
        monday_refresh_token: monday_refresh_token || '',
        monday_access_token: monday_access_token || '',
        monday_user_id: id || '',
        monday_location: monday_location || '',
        monday_account_server: monday_account_server || '',
      };
    await this.platformIntegrationsService.updatePlatformIntegration(userId, IntegrationPlatforms.MONDAY, mondayData, id);
    return existingUser;
  }

  async authorize(userId: string, mondayAuthorizeQuery: MondayAuthorizeQuery) {
    try {
      const { code, location, 'accounts-server': accountServer } = mondayAuthorizeQuery;
      const url = 'https://auth.monday.com/oauth2/token';
      const params = {
        client_id: this.mondayClientId,
        client_secret: this.mondayClientSecret,
        code: code,
        redirect_uri: this.mondayCallbackUrl
      };

      const { data } = await axios.post(url, null, {params: params});
      await this.saveUserMondayData(userId, {
        monday_access_token: data.access_token,
        monday_refresh_token: data.refresh_token,
        monday_location: location,
        monday_account_server: accountServer,
      });
      const payload = { sub: userId };
      return {
        access_token: await this.jwtService.signAsync(payload, {
          expiresIn: data.expires_in,
        }),
      };
    } catch (error) {
      console.error(error);
    }
  }

  async getUser(userId: string): Promise<User> {
    return this.userRepository.orm.findOneBy({ id: userId });
  }
 
}
