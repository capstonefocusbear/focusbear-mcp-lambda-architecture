// biome-ignore-all lint/suspicious/noConsole: auth service logging
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { UserRepository } from '../../user/repositories/user.repository';
import { PlatformIntegrationsService } from '../../platform-integrations/services/platform-integrations.service';
import { IntegrationPlatforms } from '../../platform-integrations/domain/integration-platforms.enum';
import { BaseIntegrationAuthService } from './base-integration.auth.service';
import { AuthorizeQuery } from '../dto/authorize-query.dto';
import { BullQueues } from '../../../shared/utils/constants';

@Injectable()
export class ZohoAuthService extends BaseIntegrationAuthService {
  protected readonly loginURL = 'https://accounts.zoho.com.au/oauth/v2/auth';

  constructor(
    protected readonly configService: ConfigService,
    protected readonly userRepository: UserRepository,
    @InjectQueue(BullQueues.TIME_LOGS) protected timeLogsQueue: Queue,
    protected readonly platformIntegrationsService: PlatformIntegrationsService,
  ) {
    super(configService, userRepository, timeLogsQueue, platformIntegrationsService, IntegrationPlatforms.ZOHO);
  }

  getQueryParams(callbackUrl: string) {
    const scopes = [
      'AaaServer.profile.Read',
      'ZohoProjects.tasks.ALL',
      'ZohoProjects.projects.ALL',
      'ZohoProjects.portals.ALL',
      'ZohoProjects.timesheets.ALL',
      'ZohoProjects.users.ALL',
    ];

    const queryParams: any = {
      scope: scopes.join(','),
      client_id: this.clientId,
      client_secret: this.clientSecret,
      redirect_uri: callbackUrl,
      response_type: 'code',
      access_type: 'offline',
      prompt: 'consent',
    };
    return queryParams;
  }

  async getAccountId(data: any) {
    const profileUrl = `${data.accountServer}/oauth/user/info`;
    const headers = { Authorization: `Zoho-oauthtoken ${data.access_token}` };
    const {
      data: { ZUID },
    } = await axios.get(profileUrl, { headers });
    return ZUID.toString();
  }

  async requestAuthorize(authorizeQuery: AuthorizeQuery, callbackUrl: string) {
    const { code, 'accounts-server': accountServerURL } = authorizeQuery;
    const url = `${accountServerURL}/oauth/v2/token?client_id=${this.clientId}&grant_type=authorization_code&client_secret=${this.clientSecret}&redirect_uri=${callbackUrl}&code=${code}`;
    const { data } = await axios.post(url);
    return data;
  }

  async refreshToken(userId: string) {
    const platformIntegrationRecord = await this.platformIntegrationsService.getPlatformIntegrationData(
      IntegrationPlatforms.ZOHO,
      userId,
    );
    if (!platformIntegrationRecord) return;
    const externalUserId = platformIntegrationRecord.external_user_id;
    const { data: record } = platformIntegrationRecord;
    const url = `${record.account_server}/oauth/v2/token?client_id=${this.clientId}&grant_type=refresh_token&client_secret=${this.clientSecret}&refresh_token=${record.refresh_token}`;
    const { data } = await axios.post(url);
    await this.platformIntegrationsService.updatePlatformIntegration(
      userId,
      IntegrationPlatforms.ZOHO,
      {
        access_token: data?.access_token || '',
      },
      externalUserId,
    );
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
