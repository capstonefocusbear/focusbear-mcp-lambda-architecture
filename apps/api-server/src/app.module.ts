/* eslint-disable linebreak-style */
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleAsyncOptions, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { LoggerModule } from 'nestjs-pino';
import { SentryModule } from '@app/observability';
import { SentryGlobalFilter } from '@sentry/nestjs/setup';
import { AcceptLanguageResolver, I18nModule, QueryResolver } from 'nestjs-i18n';
import * as path from 'path';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { configsArray } from './config';
import { AuthModule } from './modules/auth/auth.module';
import { PassportMiddleware } from './modules/auth/middlewares/passport.middleware';
import { ServiceAccountPassportMiddleware } from './modules/auth/middlewares/service-account-passport.middleware';
import { HelperModule } from './modules/helper/helper.module';
import { UserModule } from './modules/user/user.module';
import { ActivityModule } from './modules/activity/activity.module';
import { DeviceModule } from './modules/device/device.module';
import { FocusModeModule } from './modules/focus-mode/focus-mode.module';
import { SubscriptionModule } from './modules/subscription/subscription.module';
import { TeamModule } from './modules/team/team.module';
import { HabitPackModule } from './modules/habit-pack/habit-pack.module';
import { ActivityTemplateModule } from './modules/activity-template/activty-template.module';
import { EventsModule } from './modules/events/events.module';
import { NotificationModule } from './modules/notification/notification.module';
import { VideoMetadataModule } from './modules/video-metadata/video-metadata.module';
import { TracksModule } from './modules/tracks/tracks.module';
import { FocusModeTemplatesModule } from './modules/focus-mode-template/focus-mode-templates.module';
import { CoursesModule } from './modules/course/courses.module';
import { LessonModule } from './modules/lesson/lesson.module';
import { TabKeywordsModule } from './modules/tab-keywords/tab-keywords.module';
import { AppLogsModule } from './modules/app-logs/app-logs.module';
import { SavedWebsiteModule } from './modules/saved-website/saved-website.module';
import { ToDoModule } from './modules/to-do/to-do.module';
import { PlatformIntegrationsModule } from './modules/platform-integrations/platform-integrations.module';
import { AiModule } from './modules/ai/ai.module';
import { IntegrationModule } from './modules/integration/integration.module';
import { CalendarModule } from './modules/calendar/calendar.module';
import { SurveyModule } from './modules/survey/survey.module';
import { EmailModule } from './modules/email/email.module';
import { AsyncTaskModule } from './modules/async-task/async-task.module';
import { ZohoDeskModule } from './modules/zoho-desk/zoho-desk.module';
import { AccountabilityBuddyModule } from './modules/accountability-buddy/accountability-buddy.module';
import { DEFAULT_THROTTLE_OPTIONS } from './shared/utils/constants';
import { ObservabilityModule } from './observability/observability.module';
import { ProjectModule } from './modules/project/project.module';
import { WebhookModule } from './modules/webhook/webhook.module';
import { AnnouncementsModule } from './modules/announcements/announcements.module';
import { AppVersionsModule } from './modules/app-versions/app-versions.module';
import { NoteModule } from './modules/note/note.module';
import { GeofenceModule } from './modules/geofence/geofence.module';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [DEFAULT_THROTTLE_OPTIONS],
    }),
    ConfigModule.forRoot({ load: configsArray }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): TypeOrmModuleAsyncOptions =>
        configService.get<TypeOrmModuleOptions>('typeorm'),
    }),
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => config.get('pino'),
    }),
    SentryModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => config.get('sentry'),
    }),
    I18nModule.forRoot({
      fallbackLanguage: 'en',
      loaderOptions: {
        path: path.join(__dirname, '/shared/i18n'),
        watch: true,
      },
      resolvers: [{ use: QueryResolver, options: ['lang'] }, AcceptLanguageResolver],
    }),
    ScheduleModule.forRoot(),
    BullModule.forRoot({
      connection: { host: process.env.REDIS_HOSTNAME, port: Number(process.env.REDIS_PORT) },
      defaultJobOptions: {
        removeOnComplete: 1000,
        removeOnFail: 1000,
      },
    }),
    AuthModule,
    HelperModule,
    UserModule,
    ActivityModule,
    DeviceModule,
    FocusModeModule,
    SubscriptionModule,
    TeamModule,
    HabitPackModule,
    ActivityTemplateModule,
    EventsModule,
    NotificationModule,
    VideoMetadataModule,
    TracksModule,
    FocusModeTemplatesModule,
    CoursesModule,
    LessonModule,
    TabKeywordsModule,
    AppLogsModule,
    SavedWebsiteModule,
    ToDoModule,
    PlatformIntegrationsModule,
    AiModule,
    IntegrationModule,
    CalendarModule,
    SurveyModule,
    EmailModule,
    AsyncTaskModule,
    ZohoDeskModule,
    ObservabilityModule,
    AccountabilityBuddyModule,
    ProjectModule,
    WebhookModule,
    AnnouncementsModule,
    AppVersionsModule,
    NoteModule,
    GeofenceModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: SentryGlobalFilter,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(PassportMiddleware).forRoutes('*');
    consumer.apply(ServiceAccountPassportMiddleware).forRoutes('/service-account/*');
  }
}
