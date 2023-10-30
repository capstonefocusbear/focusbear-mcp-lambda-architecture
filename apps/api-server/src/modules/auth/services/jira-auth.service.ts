/* eslint-disable no-console */
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { UserRepository } from '../../user/repositories/user.repository';
import { AuthorizeQuery } from '../dto/authorize-query.dto';
import { PlatformIntegrationsService } from '../../platform-integrations/services/platform-integrations.service';
import { IntegrationPlatforms } from '../../platform-integrations/domain/integration-platforms.enum';
import { BaseIntegrationAuthService } from './base-integration.auth.service';

@Injectable()
export class JiraAuthService extends BaseIntegrationAuthService {
  protected readonly loginURL = 'https://auth.atlassian.com/authorize';

  protected readonly accountServerURL = 'https://api.atlassian.com/oauth/token';

  constructor(
    protected readonly configService: ConfigService,
    protected readonly userRepository: UserRepository,
    protected readonly jwtService: JwtService,
    @InjectQueue('time-logs') protected timeLogsQueue: Queue,
    protected readonly platformIntegrationsService: PlatformIntegrationsService,
  ) {
    super(
      configService,
      userRepository,
      jwtService,
      timeLogsQueue,
      platformIntegrationsService,
      IntegrationPlatforms.JIRA,
    );
  }

  protected getQueryParams() {
    const scopes = [
      'offline_access',
      'read%3Ajira-work',
      'manage%3Ajira-project',
      'manage%3Ajira-configuration',
      'read%3Ajira-user',
      'write%3Ajira-work',
      'manage%3Ajira-webhook',
      'manage%3Ajira-data-provider',
      'read%3Ame',
      'read%3Aaccount',
    ];

    const queryParams: any = {
      audience: 'api.atlassian.com',
      scope: scopes.join('%20'),
      client_id: this.clientId,
      redirect_uri: this.callbackUrl,
      response_type: 'code',
      prompt: 'consent',
    };
    return queryParams;
  }

  async getAccountId(data: any) {
    const url = 'https://api.atlassian.com/me';
    const headers = { Authorization: `Bearer ${data.access_token}` };

    const { data: account } = await axios.get(url, { headers });
    return account.account_id;
  }

  async requestAuthorize(authorizeQuery: AuthorizeQuery) {
    const { code } = authorizeQuery;
    const body = {
      grant_type: 'authorization_code',
      client_id: this.clientId,
      client_secret: this.clientSecret,
      code,
      redirect_uri: this.callbackUrl,
    };
    const headers = {
      'Content-Type': 'application/json',
    };
    const { data } = await axios.post(this.accountServerURL, body, { headers });

    return data;
  }

  async refreshToken(userId: string) {
    const platformIntegrationRecord = await this.platformIntegrationsService.getPlatformIntegrationData(
      IntegrationPlatforms.JIRA,
      userId,
    );
    if (!platformIntegrationRecord) return;
    const { data: record } = platformIntegrationRecord;
    const body = {
      grant_type: 'refresh_token',
      client_id: this.clientId,
      client_secret: this.clientSecret,
      refresh_token: record.refresh_token,
    };
    const headers = {
      'Content-Type': 'application/json',
    };
    const { data } = await axios.post(this.accountServerURL, body, { headers });

    await this.platformIntegrationsService.updatePlatformIntegration(userId, IntegrationPlatforms.JIRA, {
      access_token: data?.access_token || '',
    });
    return data;
  }

  async handleUnauthorizedError(userId: string, retryCount: number): Promise<number> {
    if (retryCount === 0) {
      await this.refreshToken(userId);
      return 1;
    }
    throw new Error('Unauthorized after retry');
  }
}
