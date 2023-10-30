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
export class TrelloAuthService extends BaseIntegrationAuthService {
  protected readonly loginURL = 'https://trello.com/1/authorize';

  protected readonly accountServerURL = 'https://api.trello.com/1';

  private appName = this.configService.get('TRELLO_APP_NAME');

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
      IntegrationPlatforms.TRELLO,
    );
  }

  getQueryParams() {
    const scope = 'read,write,account';

    const queryParams: any = {
      key: this.clientId,
      return_url: this.callbackUrl,
      name: this.appName,
      response_type: 'token',
      scope,
      expiration: 'never',
    };
    return queryParams;
  }

  async getAccountId(data: any) {
    const headers = {
      'Content-Type': 'application/json',
    };
    const { data: account } = await axios.get(
      `${this.accountServerURL}/members/me?key=${this.clientId}&token=${data.access_token}`,
      { headers },
    );

    return account.id;
  }

  requestAuthorize(authorizeQuery: AuthorizeQuery) {
    const { code } = authorizeQuery;
    const data = {
      access_token: code,
    };
    return {
      ...data,
      expires_in: 'never',
    };
  }
}
