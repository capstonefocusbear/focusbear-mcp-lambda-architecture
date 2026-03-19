// biome-ignore-all lint/suspicious/noConsole: auth service logging
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import axios from 'axios';
import { UserRepository } from '../../user/repositories/user.repository';
import { PlatformIntegrationsService } from '../../platform-integrations/services/platform-integrations.service';
import { IntegrationPlatforms } from '../../platform-integrations/domain/integration-platforms.enum';
import { BaseIntegrationAuthService } from './base-integration.auth.service';
import { AuthorizeQuery } from '../dto/authorize-query.dto';
import { BullQueues } from '../../../shared/utils/constants';

@Injectable()
export class MondayAuthService extends BaseIntegrationAuthService {
  protected readonly loginURL = 'https://auth.monday.com/oauth2/authorize';

  protected readonly accountServerURL = 'https://auth.monday.com/oauth2/token';

  constructor(
    protected readonly configService: ConfigService,
    protected readonly userRepository: UserRepository,
    @InjectQueue(BullQueues.TIME_LOGS) protected timeLogsQueue: Queue,
    protected readonly platformIntegrationsService: PlatformIntegrationsService,
  ) {
    super(configService, userRepository, timeLogsQueue, platformIntegrationsService, IntegrationPlatforms.MONDAY);
  }

  protected getQueryParams(callbackUrl: string) {
    const queryParams: any = {
      client_id: this.clientId,
      redirect_uri: callbackUrl,
    };
    return queryParams;
  }

  async getAccountId(data: any) {
    const headers = {
      Authorization: data.access_token,
      'Content-Type': 'application/json',
    };
    const query = 'query { me { id } }';
    const { data: accountId } = await axios.post('https://api.monday.com/v2', JSON.stringify({ query }), { headers });

    return accountId.account_id;
  }

  async requestAuthorize(authorizeQuery: AuthorizeQuery, callbackUrl: string) {
    const { code } = authorizeQuery;
    const params = {
      client_id: this.clientId,
      client_secret: this.clientSecret,
      code,
      redirect_uri: callbackUrl,
    };
    const { data } = await axios.post(this.accountServerURL, null, { params });
    return data;
  }
}
