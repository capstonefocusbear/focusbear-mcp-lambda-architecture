/* eslint-disable no-console */
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { UserRepository } from '../../user/repositories/user.repository';
import { AuthorizeQuery } from '../dto/authorize-query.dto';
import { PlatformIntegrationsService } from '../../platform-integrations/services/platform-integrations.service';
import { IntegrationPlatforms } from '../../platform-integrations/domain/integration-platforms.enum';
import { BaseIntegrationAuthService } from './base-integration.auth.service';
import { BullQueues } from '../../../shared/utils/constants';

@Injectable()
export class AsanaAuthService extends BaseIntegrationAuthService {
  protected readonly loginURL = 'https://app.asana.com/-/oauth_authorize';

  protected readonly accountServerURL = 'https://app.asana.com/-/oauth_token';

  constructor(
    protected readonly configService: ConfigService,
    protected readonly userRepository: UserRepository,
    @InjectQueue(BullQueues.TIME_LOGS) protected timeLogsQueue: Queue,
    protected readonly platformIntegrationsService: PlatformIntegrationsService,
  ) {
    super(configService, userRepository, timeLogsQueue, platformIntegrationsService, IntegrationPlatforms.ASANA);
  }

  protected getQueryParams(callbackUrl: string) {
    const scope = 'default';

    const queryParams: any = {
      client_id: this.clientId,
      redirect_uri: callbackUrl,
      response_type: 'code',
      scope,
    };
    return queryParams;
  }

  getAccountId(data: any) {
    return data.data.gid;
  }

  protected async requestAuthorize(authorizeQuery: AuthorizeQuery, callbackUrl: string) {
    const { code } = authorizeQuery;
    const body = {
      grant_type: 'authorization_code',
      client_id: this.clientId,
      client_secret: this.clientSecret,
      code,
      redirect_uri: callbackUrl,
    };
    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
    };
    const { data } = await axios.post(this.accountServerURL, body, { headers });
    return data;
  }

  async refreshToken(userId: string) {
    const platformIntegrationRecord = await this.platformIntegrationsService.getPlatformIntegrationData(
      IntegrationPlatforms.ASANA,
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
      'Content-Type': 'application/x-www-form-urlencoded',
    };
    const { data } = await axios.post(this.accountServerURL, body, { headers });
    await this.platformIntegrationsService.updatePlatformIntegration(userId, IntegrationPlatforms.ASANA, {
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
