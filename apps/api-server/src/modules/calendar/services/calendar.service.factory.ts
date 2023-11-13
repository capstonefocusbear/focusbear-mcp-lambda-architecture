import { Injectable } from '@nestjs/common';
import { IntegrationPlatforms } from '../../platform-integrations/domain/integration-platforms.enum';
import { GoogleCalendarService } from './google-calendar.service';
import { MicrosoftCalendarService } from './microsoft-calendar.service';

@Injectable()
export class CalendarServiceFactory {
  constructor(
    private readonly googleCalendarService: GoogleCalendarService,
    private readonly microsoftCalendarervice: MicrosoftCalendarService,
  ) {}

  get(platform: IntegrationPlatforms) {
    switch (platform) {
      case IntegrationPlatforms.GOOGLE:
        return this.googleCalendarService;
      case IntegrationPlatforms.MICROSOFT:
        return this.microsoftCalendarervice;
      default:
        throw Error(`${platform} Platform Service Not Found`);
    }
  }
}
