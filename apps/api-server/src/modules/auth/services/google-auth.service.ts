import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { google } from 'googleapis';

import { UserRepository } from '../../user/repositories/user.repository';
import { AuthorizeQuery } from '../dto/authorize-query.dto';
import { PlatformIntegrationsService } from '../../platform-integrations/services/platform-integrations.service';
import { IIntegrationAuthService } from './integration-auth.service.interface';
import { IntegrationPlatforms } from '../../platform-integrations/domain/integration-platforms.enum';
import { User } from '../../user/entities/user.entity';

@Injectable()
export class GoogleAuthService implements IIntegrationAuthService {
  protected readonly clientId: string;

  protected readonly clientSecret: string;

  protected readonly callbackUrl: string;

  private readonly oauth2Client;

  private readonly platform = IntegrationPlatforms.GOOGLE;

  constructor(
    protected readonly configService: ConfigService,
    protected readonly userRepository: UserRepository,
    @InjectQueue('time-logs') protected timeLogsQueue: Queue,
    protected readonly platformIntegrationsService: PlatformIntegrationsService,
  ) {
    this.clientId = this.configService.get(`${this.platform.toUpperCase()}_CLIENT_ID`);
    this.clientSecret = this.configService.get(`${this.platform.toUpperCase()}_CLIENT_SECRET`);
    this.callbackUrl = this.configService.get(`${this.platform.toUpperCase()}_CALLBACK_URL`);

    this.oauth2Client = new google.auth.OAuth2(this.clientId, this.clientSecret, this.callbackUrl);
  }

  getLoginUrl() {
    const scopes = ['https://www.googleapis.com/auth/calendar.readonly'];
    const authorizationUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      include_granted_scopes: true,
      response_type: 'code',
      prompt: 'login',
    });

    return { redirect_url: authorizationUrl };
  }

  async saveUserData(userId: string, data: any, accountId: string): Promise<any> {
    const existingUser = await this.getUser(userId);
    if (!existingUser) {
      throw new NotFoundException(`User with ID: ${userId} not found!`);
    }

    await this.platformIntegrationsService.updatePlatformIntegration(userId, this.platform, data, accountId);
    return existingUser;
  }

  async getUser(userId: string): Promise<User> {
    return this.userRepository.orm.findOneBy({ id: userId });
  }

  async authorize(userId: string, authorizeQuery: AuthorizeQuery) {
    try {
      const data = await this.requestAuthorize(authorizeQuery);
      if (!data.access_token) {
        throw new Error(`Failed to authenticate user with ID: ${userId} with platform, no access token returned`);
      }

      const { email } = await this.oauth2Client.getTokenInfo(data.access_token);

      await this.saveUserData(userId, data, email);
    } catch (error) {
      console.error(error);
    }
  }

  protected async requestAuthorize(authorizeQuery: AuthorizeQuery) {
    const { tokens } = await this.oauth2Client.getToken(authorizeQuery.code);
    return tokens;
  }
}
