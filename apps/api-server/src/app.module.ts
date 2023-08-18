import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleAsyncOptions, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { LoggerModule } from 'nestjs-pino';
import { SentryModule } from '@ntegral/nestjs-sentry';
import { AcceptLanguageResolver, I18nModule, QueryResolver } from 'nestjs-i18n';
import * as path from 'path';
import { AppController } from './app.controller';
import { configsArray } from './config';
import { AuthModule } from './modules/auth/auth.module';
import { PassportMiddleware } from './modules/auth/middlewares/passport.middleware';
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
import { ZohoModule } from './modules/zoho/zoho.module';

@Module({
  imports: [
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
    ZohoModule,
  ],
  controllers: [AppController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(PassportMiddleware).forRoutes(':splat*');
  }
}
