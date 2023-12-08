import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CalendarController } from './controllers/calendar.controller';
import { CalendarServiceFactory } from './services/calendar.service.factory';
import { PlatformIntegrationsService } from '../platform-integrations/services/platform-integrations.service';
import { PlatformIntegrationRepository } from '../platform-integrations/repositories/platform-integration.repository';
import { GoogleCalendarService } from './services/google-calendar.service';
import { MicrosoftCalendarService } from './services/microsoft-calendar.service';
import { NotificationRepository } from '../notification/repository/notification.repository';
import { NotificationModule } from '../notification/notification.module';
import { CalendarKeyword } from './entities/calendar-keywords.entity';
import { Calendar } from './entities/calendar.entity';
import { CalendarService } from './services/calendar.service';
import { CalendarKeywordRepository } from './repositories/calendar-keyword.repository';
import { CalendarRepository } from './repositories/calendar.repository';
import { UserRepository } from '../user/repositories/user.repository';
import { User } from '../user/entities/user.entity';

@Module({
  imports: [NotificationModule, TypeOrmModule.forFeature([CalendarKeyword, Calendar, User])],
  controllers: [CalendarController],
  providers: [
    UserRepository,
    NotificationRepository,
    CalendarServiceFactory,
    CalendarService,
    CalendarKeywordRepository,
    CalendarRepository,
    GoogleCalendarService,
    MicrosoftCalendarService,
    ConfigService,
    PlatformIntegrationsService,
    PlatformIntegrationRepository,
  ],
})
export class CalendarModule {}
