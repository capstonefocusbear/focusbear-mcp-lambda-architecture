import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { CalendarController } from './controllers/calendar.controller';
import { CalendarServiceFactory } from './services/calendar.service.factory';
import { PlatformIntegrationsService } from '../platform-integrations/services/platform-integrations.service';
import { PlatformIntegrationRepository } from '../platform-integrations/repositories/platform-integration.repository';
import { GoogleCalendarService } from './services/google-calendar.service';
import { MicrosoftCalendarService } from './services/microsoft-calendar.service';
import { NotificationRepository } from '../notification/repository/notification.repository';
import { NotificationModule } from '../notification/notification.module';
import { CalendarExcludedKeyword } from './entities/calendar-excluded-keywords.entity';
import { Calendar } from './entities/calendar.entity';
import { CalendarService } from './services/calendar.service';
import { CalendarExcluededKeywordRepository } from './repositories/calendar-excluded-keyword.repository';
import { CalendarRepository } from './repositories/calendar.repository';
import { UserRepository } from '../user/repositories/user.repository';
import { User } from '../user/entities/user.entity';
import { SyncEventsConsumer } from './consumers/sync-events.consumer';
import { BullQueues } from '../../shared/utils/constants';

@Module({
  imports: [
    NotificationModule,
    TypeOrmModule.forFeature([CalendarExcludedKeyword, Calendar, User]),
    BullModule.registerQueue({
      name: BullQueues.SYNC_EVENTS,
    }),
  ],
  controllers: [CalendarController],
  exports: [GoogleCalendarService, MicrosoftCalendarService],
  providers: [
    UserRepository,
    NotificationRepository,
    CalendarServiceFactory,
    CalendarService,
    CalendarExcluededKeywordRepository,
    CalendarRepository,
    GoogleCalendarService,
    MicrosoftCalendarService,
    ConfigService,
    PlatformIntegrationsService,
    PlatformIntegrationRepository,
    SyncEventsConsumer,
  ],
})
export class CalendarModule {}
