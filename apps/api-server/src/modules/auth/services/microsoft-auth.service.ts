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
export class MicrosoftAuthService extends BaseIntegrationAuthService {
  protected readonly loginURL;

  protected readonly tenantId;

  protected readonly tokenURL;

  verfier: string;

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
    const scope = 'https%3A%2F%2Fgraph.microsoft.com%2FCalendars.Read';
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

  async getAccountId(data: any) {
    return data;
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
