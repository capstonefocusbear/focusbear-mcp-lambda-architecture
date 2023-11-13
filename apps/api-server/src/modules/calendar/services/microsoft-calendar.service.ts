import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { PlatformIntegrationsService } from '../../platform-integrations/services/platform-integrations.service';
import { IntegrationPlatforms } from '../../platform-integrations/domain/integration-platforms.enum';

@Injectable()
export class MicrosoftCalendarService {
  protected readonly tenantId;

  protected readonly clientId;

  protected readonly clientSecret;

  protected readonly callbackUrl;

  protected readonly scopes = ['https://graph.microsoft.com/Calendars.Read'];

  constructor(
    protected readonly configService: ConfigService,
    private readonly platformIntegrationService: PlatformIntegrationsService,
  ) {
    this.tenantId = configService.get('MICROSOFT_TENANT_ID');
    this.clientId = configService.get('MICROSOFT_CLIENT_ID');
    this.clientSecret = configService.get('MICROSOFT_CLIENT_SECRET');
    this.callbackUrl = configService.get('MICROSOFT_CALLBACK_URL');
  }

  async getEvents(userId) {
    const platform = IntegrationPlatforms.MICROSOFT;
    const record = await this.platformIntegrationService.getPlatformIntegrationData(platform, userId);

    const baseUrl = 'https://graph.microsoft.com/v1.0';
    const { data } = await axios.get(`${baseUrl}/me/calendar/events`, {
      headers: {
        Authorization: `Bearer ${record.data.access_token}`,
      },
    });
    return data.value;
  }
}
