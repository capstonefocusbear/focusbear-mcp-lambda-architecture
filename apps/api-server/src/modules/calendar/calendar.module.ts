import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CalendarController } from './controllers/calendar.controller';
import { CalendarServiceFactory } from './services/calendar.service.factory';
import { PlatformIntegrationsService } from '../platform-integrations/services/platform-integrations.service';
import { PlatformIntegrationRepository } from '../platform-integrations/repositories/platform-integration.repository';
import { GoogleCalendarService } from './services/google-calendar.service';
import { MicrosoftCalendarService } from './services/microsoft-calendar.service';
import { NotificationRepository } from '../notification/repository/notification.repository';

@Module({
  imports: [],
  controllers: [CalendarController],
  providers: [
    NotificationRepository,
    CalendarServiceFactory,
    GoogleCalendarService,
    MicrosoftCalendarService,
    ConfigService,
    PlatformIntegrationsService,
    PlatformIntegrationRepository,
  ],
})
export class CalendarModule {}
