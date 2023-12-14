import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { DateTime } from 'luxon';
import { UserRepository } from '../../user/repositories/user.repository';
import { AuthorizeQuery } from '../dto/authorize-query.dto';
import { PlatformIntegrationsService } from '../../platform-integrations/services/platform-integrations.service';
import { IntegrationPlatforms } from '../../platform-integrations/domain/integration-platforms.enum';
import { BaseIntegrationAuthService } from './base-integration.auth.service';

@Injectable()
export class MicrosoftAuthService extends BaseIntegrationAuthService {
  protected readonly loginURL;

  protected readonly tenantId;

  protected readonly tokenURL;

  constructor(
    protected readonly configService: ConfigService,
    protected readonly userRepository: UserRepository,
    @InjectQueue('time-logs') protected timeLogsQueue: Queue,
    protected readonly platformIntegrationsService: PlatformIntegrationsService,
  ) {
    super(configService, userRepository, timeLogsQueue, platformIntegrationsService, IntegrationPlatforms.MICROSOFT);
    this.tenantId = configService.get('MICROSOFT_TENANT_ID');
    this.loginURL = `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/authorize`;
    this.tokenURL = `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`;
  }

  getQueryParams() {
    const scope = 'https://graph.microsoft.com/Calendars.Read';
    const queryParams: any = {
      client_id: this.clientId,
      response_type: 'code',
      redirect_uri: this.callbackUrl,
      response_mode: 'query',
      scope,
      prompt: 'login',
    };
    return queryParams;
  }

  async saveUserData(
    userId: string,
    data: {
      client_id: string;
      access_token: string;
      refresh_token: string;
      account_server: string;
      expiry_date: number;
      accountId: string;
      location: string;
    },
  ): Promise<any> {
    const { accountId } = data;
    const existingUser = await this.getUser(userId);
    if (!existingUser) {
      throw new NotFoundException(`User with ID: ${userId} not found!`);
    }
    let newData;
    if (data.refresh_token) {
      newData = data;
    } else {
      newData = {
        client_id: data.client_id,
        access_token: data.access_token,
        account_server: data.account_server,
        expiry_date: data.expiry_date,
        accountId: data.accountId,
        location: data.location,
      };
    }
    await this.platformIntegrationsService.updatePlatformIntegration(userId, this.platform, newData, accountId);
    return existingUser;
  }

  async getAccountId(data: any) {
    const userInfoURL = 'https://graph.microsoft.com/v1.0/me';
    const headers = {
      Authorization: `Bearer ${data.access_token}`,
    };
    const { data: userInfoData } = await axios.get(`${userInfoURL}`, { headers });
    if (userInfoData.mail) {
      return userInfoData.mail;
    }
    return userInfoData.userPrincipalName;
  }

  async authorize(userId: string, authorizeQuery: AuthorizeQuery) {
    try {
      const data = await this.requestAuthorize(authorizeQuery);
      if (!data.access_token) {
        throw new Error(`Failed to authenticate user with ID: ${userId} with platform, no access token returned`);
      }
      const { location, 'accounts-server': accountServer } = authorizeQuery;
      const accountId = await this.getAccountId({
        ...data,
        accountServer,
      });
      const expiry_date = (DateTime.local().toSeconds() + data.expires_in) * 1000;
      await this.saveUserData(userId, {
        client_id: this.clientId,
        access_token: data.access_token || '',
        refresh_token: data.refresh_token || '',
        account_server: accountServer || '',
        expiry_date,
        location: location || '',
        accountId,
      });
    } catch (error) {
      console.error(error);
    }
  }

  protected async requestAuthorize(authorizeQuery: AuthorizeQuery) {
    const { code } = authorizeQuery;
    const scope = 'https://graph.microsoft.com/Calendars.Read';
    const body = {
      client_id: this.clientId,
      scope,
      code,
      redirect_uri: this.callbackUrl,
      grant_type: 'authorization_code',
      client_secret: this.clientSecret,
    };
    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
    };

    const { data } = await axios.post(this.tokenURL, body, {
      headers,
    });
    return data;
  }
}
