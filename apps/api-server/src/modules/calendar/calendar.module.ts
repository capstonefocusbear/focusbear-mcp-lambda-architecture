import { forwardRef, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
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
import { PlatformIntegrationsModule } from '../platform-integrations/platform-integrations.module';
import { AuthModule } from '../auth/auth.module';
import { ReauthService } from './services/reauth.service';

@Module({
  imports: [
    forwardRef(() => PlatformIntegrationsModule),
    forwardRef(() => AuthModule),
    NotificationModule,
    TypeOrmModule.forFeature([CalendarExcludedKeyword, Calendar, User]),
    BullModule.registerQueue({
      name: BullQueues.SYNC_EVENTS,
      defaultJobOptions: {
        attempts: 5, // Retry up to 5 times
        backoff: {
          type: 'exponential',
          delay: 5000, // Start with 5 second delay
          jitter: 0.2, // Add 20% jitter to prevent thundering herd
        },
        removeOnComplete: {
          count: 100, // Keep last 100 completed jobs for debugging
        },
        removeOnFail: {
          count: 100, // Keep last 100 failed jobs for debugging
        },
      },
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
    ReauthService,
  ],
})
export class CalendarModule {}
