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

@Injectable()
export class ClickupAuthService extends BaseIntegrationAuthService {
  protected readonly loginURL = 'https://app.clickup.com/api';

  protected readonly accountServerURL = 'https://api.clickup.com/api/v2';

  constructor(
    protected readonly configService: ConfigService,
    protected readonly userRepository: UserRepository,
    @InjectQueue('time-logs') protected timeLogsQueue: Queue,
    protected readonly platformIntegrationsService: PlatformIntegrationsService,
  ) {
    super(configService, userRepository, timeLogsQueue, platformIntegrationsService, IntegrationPlatforms.CLICK_UP);
  }

  getQueryParams() {
    const queryParams: any = {
      client_id: this.clientId,
      redirect_uri: this.callbackUrl,
    };
    return queryParams;
  }

  async getAccountId(data: any) {
    const headers = {
      Authorization: `Bearer ${data.access_token}`,
    };
    const { data: account } = await axios.get(`${this.accountServerURL}/user`, { headers });
    return account.user.id;
  }

  protected async requestAuthorize(authorizeQuery: AuthorizeQuery) {
    const { code } = authorizeQuery;
    const body = {
      client_id: this.clientId,
      client_secret: this.clientSecret,
      code,
    };
    const { data } = await axios.post(`${this.accountServerURL}/oauth/token`, body);

    return {
      ...data,
      expires_in: 'never',
    };
  }
}
