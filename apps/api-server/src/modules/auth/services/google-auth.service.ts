import { forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { google } from 'googleapis';
import axios from 'axios';
import { InjectSentry, SentryService } from '@app/observability';
import { DateTime } from 'luxon';
import { UserRepository } from '../../user/repositories/user.repository';
import { AuthorizeQuery } from '../dto/authorize-query.dto';
import { PlatformIntegrationsService } from '../../platform-integrations/services/platform-integrations.service';
import { IIntegrationAuthService } from './integration-auth.service.interface';
import { IntegrationPlatforms } from '../../platform-integrations/domain/integration-platforms.enum';
import { User } from '../../user/entities/user.entity';
import { GoogleCalendarService } from '../../calendar/services/google-calendar.service';
import { BullQueues } from '../../../shared/utils/constants';
import { PlatformIntegrationMetadataDto } from '../../platform-integrations/dto/platform-integration-metadata.dto';

@Injectable()
export class GoogleAuthService implements IIntegrationAuthService {
  protected readonly clientId: string;

  protected readonly clientSecret: string;

  protected readonly callbackUrl: string;

  private readonly oauth2Client: typeof google.auth.OAuth2.prototype;

  private readonly platform = IntegrationPlatforms.GOOGLE;

  private readonly nodeEnv: string;

  constructor(
    protected readonly configService: ConfigService,
    protected readonly userRepository: UserRepository,
    @InjectQueue(BullQueues.TIME_LOGS) protected timeLogsQueue: Queue,
    @Inject(forwardRef(() => PlatformIntegrationsService))
    protected readonly platformIntegrationsService: PlatformIntegrationsService,
    private readonly googleCalendarService: GoogleCalendarService,
    @InjectSentry() private readonly sentryService: SentryService,
  ) {
    this.nodeEnv = this.configService.get('NODE_ENV');
    this.clientId =
      this.nodeEnv !== undefined && this.nodeEnv === 'dev'
        ? this.configService.get(`${this.platform.toUpperCase()}_DEVELOPMENT_CLIENT_ID`)
        : this.configService.get(`${this.platform.toUpperCase()}_CLIENT_ID`);
    this.clientSecret =
      this.nodeEnv !== undefined && this.nodeEnv === 'dev'
        ? this.configService.get(`${this.platform.toUpperCase()}_DEVELOPMENT_CLIENT_SECRET`)
        : this.configService.get(`${this.platform.toUpperCase()}_CLIENT_SECRET`);
    this.callbackUrl =
      this.nodeEnv !== undefined && this.nodeEnv === 'dev'
        ? this.configService.get(`${this.platform.toUpperCase()}_DEVELOPMENT_CALLBACK_URL`)
        : this.configService.get(`${this.platform.toUpperCase()}_CALLBACK_URL`);

    this.oauth2Client = new google.auth.OAuth2(this.clientId, this.clientSecret, this.callbackUrl);
  }

  getLoginUrl() {
    const scopes = [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/offline',
    ];
    const authorizationUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      include_granted_scopes: true,
      response_type: 'code',
      prompt: 'consent',
    });

    return { redirect_url: authorizationUrl };
  }

  async saveUserData(userId: string, authData: PlatformIntegrationMetadataDto, accountId: string): Promise<any> {
    const existingUser = await this.getUser(userId);
    if (!existingUser) {
      throw new NotFoundException(`User with ID: ${userId} not found!`);
    }

    await this.platformIntegrationsService.updatePlatformIntegration(userId, this.platform, authData, accountId);
  }

  async getUser(userId: string): Promise<User> {
    return this.userRepository.orm.findOneBy({ id: userId });
  }

  async authorize(userId: string, authorizeQuery: AuthorizeQuery) {
    try {
      const authData: PlatformIntegrationMetadataDto = await this.requestAuthorize(authorizeQuery);
      if (!authData.access_token) {
        throw new Error(`Failed to authenticate user with ID: ${userId} with platform, no access token returned`);
      }

      if (!authData.refresh_token) {
        throw new Error(`Failed to authenticate user with ID: ${userId} with platform, no refresh token returned`);
      }
      if (authData.expiry_date && authData.expiry_date < DateTime.now().toSeconds()) {
        throw new Error(`Failed to authenticate user with ID: ${userId} with platform, token expired`);
      }

      const { data: userInfo } = await axios.get(
        `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${authData.access_token}`,
      );
      const accountId = userInfo.email;
      this.sentryService.instance().addBreadcrumb({
        message: 'User authenticated with Google',
        data: {
          hasAccesss_token: !!authData.access_token,
          hasRefresh_token: !!authData.refresh_token,
          expiresIn: DateTime.fromSeconds(authData.expiry_date).toISO(),
        },
      });
      await this.saveUserData(userId, authData, accountId);
      if (accountId) {
        await this.googleCalendarService.updateEvents(userId, accountId);
      }
      return { message: 'Successfully authenticated with Google' };
    } catch (error) {
      console.error(error);
    }
  }

  protected async requestAuthorize(authorizeQuery: AuthorizeQuery): Promise<PlatformIntegrationMetadataDto> {
    const { tokens } = await this.oauth2Client.getToken(authorizeQuery.code);
    return tokens as PlatformIntegrationMetadataDto;
  }

  async refreshToken(userId: string, userExternalId?: string) {
    try {
      const existingRecord = await this.platformIntegrationsService.getPlatformIntegrationData(
        this.platform,
        userId,
        userExternalId,
      );

      if (!existingRecord || !existingRecord.data.refresh_token) {
        throw new Error(`No valid refresh token found for user ${userId}`);
      }

      this.oauth2Client.setCredentials({ refresh_token: existingRecord.data.refresh_token });
      const { credentials } = await this.oauth2Client.refreshAccessToken();

      if (!credentials.access_token) {
        throw new Error(`Failed to refresh access token for user ${userId}`);
      }

      // Update the integration record with the new tokens
      const updatedAuthData: Partial<PlatformIntegrationMetadataDto> = {
        access_token: credentials.access_token,
        expiry_date: credentials.expiry_date,
      };

      if (credentials.refresh_token) {
        updatedAuthData.refresh_token = credentials.refresh_token;
      }

      await this.platformIntegrationsService.updatePlatformIntegration(
        userId,
        this.platform,
        updatedAuthData as PlatformIntegrationMetadataDto,
        userExternalId,
      );

      return credentials.access_token;
    } catch (error) {
      this.sentryService.instance().captureException(error);
      throw new Error(`Could not refresh access token for user ${userId}`);
    }
  }
}
