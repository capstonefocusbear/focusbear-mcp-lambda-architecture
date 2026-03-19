// biome-ignore-all lint/suspicious/noConsole: auth service logging
import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { BullQueues, MAX_RETRY } from '../../../shared/utils/constants';
import { UserRepository } from '../../user/repositories/user.repository';
import { User } from '../../user/entities/user.entity';
import { AuthorizeQuery } from '../dto/authorize-query.dto';
import { PlatformIntegrationsService } from '../../platform-integrations/services/platform-integrations.service';
import { IntegrationPlatforms } from '../../platform-integrations/domain/integration-platforms.enum';
import { IIntegrationAuthService } from './integration-auth.service.interface';
import { PlatformIntegrationMetadataDto } from '../../platform-integrations/dto/platform-integration-metadata.dto';

export abstract class BaseIntegrationAuthService implements IIntegrationAuthService {
  protected readonly loginURL: string;

  protected readonly clientId: string;

  protected readonly clientSecret: string;

  constructor(
    protected readonly configService: ConfigService,
    protected readonly userRepository: UserRepository,
    @InjectQueue(BullQueues.TIME_LOGS) protected timeLogsQueue: Queue,
    protected readonly platformIntegrationsService: PlatformIntegrationsService,
    protected readonly platform: IntegrationPlatforms,
  ) {
    this.clientId = this.configService.get(`${platform.toUpperCase()}_CLIENT_ID`);
    this.clientSecret = this.configService.get(`${platform.toUpperCase()}_CLIENT_SECRET`);
  }

  getLoginUrl(isDevelopment: boolean) {
    const callbackUrl = this.getCallbackUrl(isDevelopment);
    const queryParams = this.getQueryParams(callbackUrl);

    // convert queryParams to query string
    const queryParamsStr = Object.keys(queryParams)
      .map((key) => `${key}=${queryParams[key]}`)
      .join('&');

    return { redirect_url: `${this.loginURL}?${queryParamsStr}` };
  }

  getCallbackUrl(isDevelopment: boolean) {
    const envVar = isDevelopment
      ? `${this.platform.toUpperCase()}_DEVELOPMENT_CALLBACK_URL`
      : `${this.platform.toUpperCase()}_CALLBACK_URL`;
    return this.configService.get(envVar);
  }

  protected abstract getQueryParams(callbackUrl: string);

  async saveUserData(userId: string, data: PlatformIntegrationMetadataDto): Promise<any> {
    const { accountId } = data;
    const existingUser = await this.getUser(userId);
    if (!existingUser) {
      throw new NotFoundException(`User with ID: ${userId} not found!`);
    }

    await this.platformIntegrationsService.updatePlatformIntegration(userId, this.platform, data, accountId);
    return existingUser;
  }

  protected abstract getAccountId(data: any);

  async authorize(userId: string, authorizeQuery: AuthorizeQuery) {
    const callbackUrl = this.getCallbackUrl(authorizeQuery.is_development);
    const data = await this.requestAuthorize(authorizeQuery, callbackUrl);
    if (!data.access_token) {
      throw new Error(`Failed to authenticate user with ID: ${userId} with platform, no access token returned`);
    }
    const { location, 'accounts-server': accountServer } = authorizeQuery;
    const accountId = await this.getAccountId({
      ...data,
      accountServer,
    });
    await this.saveUserData(userId, {
      client_id: this.clientId,
      access_token: data.access_token || '',
      refresh_token: data.refresh_token || '',
      account_server: accountServer || '',
      location: location || '',
      accountId,
    });
  }

  protected abstract requestAuthorize(authorizeQuery: AuthorizeQuery, callbackUrl: string);

  async getUser(userId: string): Promise<User> {
    return this.userRepository.orm.findOneBy({ id: userId });
  }

  async handleUnauthorizedError(userId: string, retryCount: number): Promise<number> {
    // Don't try again in case there is no refresh_token by default
    if (retryCount === 0) {
      return MAX_RETRY;
    }
    throw new Error('Unauthorized after retry');
  }
}
