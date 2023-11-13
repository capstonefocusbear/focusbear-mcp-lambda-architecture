import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import { PlatformIntegrationsService } from '../../platform-integrations/services/platform-integrations.service';
import { IntegrationPlatforms } from '../../platform-integrations/domain/integration-platforms.enum';

@Injectable()
export class GoogleCalendarService {
  constructor(
    protected readonly configService: ConfigService,
    private readonly platformIntegrationService: PlatformIntegrationsService,
  ) {}

  async getEvents(userId) {
    const platform = IntegrationPlatforms.GOOGLE;
    const record = await this.platformIntegrationService.getPlatformIntegrationData(platform, userId);
    const clientId = this.configService.get(`${platform.toUpperCase}_CLIENT_ID`);
    const clientSecret = this.configService.get(`${platform.toUpperCase()}_CLIENT_SECRET`);
    const callbackUrl = this.configService.get(`${platform.toUpperCase()}_CALLBACK_URL`);

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, callbackUrl);
    oauth2Client.setCredentials(record.data);

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const res = await calendar.events.list({
      calendarId: 'primary',
      timeMin: new Date().toISOString(),
      maxResults: 10,
      singleEvents: true,
      orderBy: 'startTime',
    });
    const events = res.data.items;

    return events;
  }
}
