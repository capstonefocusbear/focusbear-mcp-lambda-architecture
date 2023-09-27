/* eslint-disable no-console */
import { Injectable, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { UserRepository } from '../../user/repositories/user.repository';
import { User } from '../../user/entities/user.entity';
import { ZohoAuthorizeQuery } from '../dto/zoho-authorize-query.dto';
import { PlatformIntegrationsService } from '../../platform-integrations/services/platform-integrations.service';
import { IntegrationPlatforms } from '../../platform-integrations/domain/integration-platforms.enum';

@Injectable()
export class ZohoAuthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService,
    @InjectQueue('time-logs') private timeLogsQueue: Queue,
    private readonly platformIntegrationsService: PlatformIntegrationsService,
  ) {}

  private zohoClientId = this.configService.get('zoho.ZOHO_CLIENT_ID');

  private zohoClientSecret = this.configService.get('zoho.ZOHO_CLIENT_SECRET');

  private zohoCallbackUrl = this.configService.get('zoho.ZOHO_CALLBACK_URL');

  private zohoCallbackUrlDevelopment = this.configService.get('zoho.ZOHO_CALLBACK_URL_DEVELOPMENT');

  getZohoLoginUrl(isDevelopment = false) {
    const scopes = [
      'AaaServer.profile.Read',
      'ZohoProjects.tasks.ALL',
      'ZohoProjects.projects.ALL',
      'ZohoProjects.portals.ALL',
      'ZohoProjects.timesheets.ALL',
      'ZohoProjects.users.ALL',
    ];

    let queryParams: any = {
      scope: scopes.join(','),
      client_id: this.zohoClientId,
      client_secret: this.zohoClientSecret,
      redirect_uri: isDevelopment ? this.zohoCallbackUrlDevelopment : this.zohoCallbackUrl,
      response_type: 'code',
      access_type: 'offline',
      prompt: 'consent',
    };
    // convert queryParams to query string
    queryParams = Object.keys(queryParams)
      .map((key) => `${key}=${queryParams[key]}`)
      .join('&');
    return { redirect_url: `https://accounts.zoho.com.au/oauth/v2/auth?${queryParams}` };
  }

  async saveUserZohoData(
    userId: string,
    data: {
      zoho_access_token: string;
      zoho_refresh_token: string;
      zoho_location: string;
      zoho_account_server: string;
    },
  ): Promise<any> {
    const { zoho_access_token, zoho_refresh_token, zoho_location, zoho_account_server } = data;
    const existingUser = await this.getUser(userId);
    if (!existingUser) {
      throw new NotFoundException(`User with ID: ${userId} not found!`);
    }
    // Get user Zoho ID
    const profileUrl = `${zoho_account_server}/oauth/user/info`;
    const headers = { Authorization: `Zoho-oauthtoken ${zoho_access_token}` };
    const {
      data: { ZUID },
    } = await axios.get(profileUrl, { headers });
    // Save user Zoho info needed for requests to Zoho Projects API
    const zohoData = {
      zoho_refresh_token: zoho_refresh_token || '',
      zoho_access_token: zoho_access_token || '',
      zoho_user_id: ZUID || '',
      zoho_location: zoho_location || '',
      zoho_account_server: zoho_account_server || '',
    };
    await this.platformIntegrationsService.updatePlatformIntegration(userId, IntegrationPlatforms.ZOHO, zohoData, ZUID);
    return existingUser;
  }

  async refreshToken(userId: string) {
    const platformIntegrationRecord = await this.platformIntegrationsService.getPlatformIntegrationData(
      IntegrationPlatforms.ZOHO,
      userId,
    );
    if (!platformIntegrationRecord) return;
    const { data: zohoData } = platformIntegrationRecord;
    const url = `${zohoData.zoho_account_server}/oauth/v2/token?client_id=${this.zohoClientId}&grant_type=refresh_token&client_secret=${this.zohoClientSecret}&refresh_token=${zohoData.zoho_refresh_token}`;
    const { data } = await axios.post(url);
    await this.platformIntegrationsService.updatePlatformIntegration(userId, IntegrationPlatforms.ZOHO, {
      zoho_access_token: data?.access_token || '',
    });
    return data;
  }

  async authorize(userId: string, zohoAuthorizeQuery: ZohoAuthorizeQuery) {
    try {
      const { code, location, 'accounts-server': accountServer, is_development } = zohoAuthorizeQuery;
      const url = `${accountServer}/oauth/v2/token?client_id=${
        this.zohoClientId
      }&grant_type=authorization_code&client_secret=${this.zohoClientSecret}&redirect_uri=${
        is_development ? this.zohoCallbackUrlDevelopment : this.zohoCallbackUrl
      }&code=${code}`;
      const { data } = await axios.post(url);
      await this.saveUserZohoData(userId, {
        zoho_access_token: data.access_token,
        zoho_refresh_token: data.refresh_token,
        zoho_location: location,
        zoho_account_server: accountServer,
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

  async handleUnauthorizedError(userId: string, retryCount: number): Promise<number> {
    if (retryCount === 0) {
      await this.refreshToken(userId);
      return 1;
    }
    throw new Error('Unauthorized after retry');
  }
}
