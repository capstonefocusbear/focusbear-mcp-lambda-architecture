import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { Auth0Module } from '@app/auth0';
import { OpenAIModule } from '@app/openai';
import { IStripeOptions, StripeModule } from '@app/stripe';
import { IRevenueCatOptions, RevenueCatModule } from '@app/revenue-cat';
import { R2Module } from '@app/r2/r2.module';
import { ISendGridOptions, SendGridModule } from '@app/send-grid';
import { BrevoModule } from '@app/brevo/brevo.module';
import { IPusherOptions, PusherModule } from '@app/pusher';
import { IPusherBeamsOptions, PusherBeamsModule } from '@app/pusher-beams';
import { ActivityModule } from '../activity/activity.module';
import { AuthModule } from '../auth/auth.module';
import { UserSettingsController } from './controllers/user-settings/user-settings.controller';
import { UserController } from './controllers/user/user.controller';
import { User } from './entities/user.entity';
import { UserRepository } from './repositories/user.repository';
import { UserSettingsService } from './services/user-settings/user-settings.service';
import { UserService } from './services/user/user.service';
import { SubscriptionModule } from '../subscription/subscription.module';
import { UserLocalDeviceSettingsController } from './controllers/user-local-device-settings/user-local-device-settings.controller';
import { HabitPackModule } from '../habit-pack/habit-pack.module';
import { FocusModeTemplatesModule } from '../focus-mode-template/focus-mode-templates.module';
import { UserConsentService } from './services/user-consent/user-consent.service';
import { UserConsentRepository } from './repositories/user-consent.repository';
import { UserDailyStatsService } from './services/user-daily-stats/user-daily-stats.service';
import { DailyStatsRepository } from './repositories/user-daily-stats.repository';
import { DailyStatsConsumer } from './consumers/daily-stats.consumer';
import { DeviceModule } from '../device/device.module';
import { AdminAccessRequestRepository } from './repositories/admin-access-requests.repository';
import { UserDataService } from './services/user-data/user-data.service';
import { UserDataController } from './controllers/user-data/user-data.controller';
import { HelperModule } from '../helper/helper.module';
import { UserStatsController } from './controllers/user-stats/user-stats.controller';
import { UserPersonalDataConsumer } from './consumers/user-data.consumer';
import { ProfitWellConsumer } from './consumers/profitwell.consumer';
import { RevenueCatStatusConsumer } from './consumers/revenue-cat-status.consumer';
import { UserFeedbackRepository } from './repositories/user-feedback.repository';
import { UserFeedbackController } from './controllers/user-feedback/user-feedback.controller';
import { UserFeedbackService } from './services/user-feedback/user-feedback.service';
import { ToDoModule } from '../to-do/to-do.module';
import { PlatformIntegrationsModule } from '../platform-integrations/platform-integrations.module';
import { BullQueues } from '../../shared/utils/constants';

@Module({
  providers: [
    UserSettingsService,
    UserRepository,
    UserService,
    UserConsentService,
    UserConsentRepository,
    UserDailyStatsService,
    DailyStatsRepository,
    DailyStatsConsumer,
    AdminAccessRequestRepository,
    UserDataService,
    UserPersonalDataConsumer,
    ProfitWellConsumer,
    RevenueCatStatusConsumer,
    UserFeedbackRepository,
    UserFeedbackService,
  ],
  exports: [UserRepository, UserService, UserSettingsService, UserDailyStatsService],
  imports: [
    TypeOrmModule.forFeature([User]),
    Auth0Module.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): any => configService.get('auth0'),
    }),
    RevenueCatModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): IRevenueCatOptions => configService.get('revenueCat'),
    }),
    StripeModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): IStripeOptions => configService.get('stripeConfig'),
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => config.get('bull'),
    }),
    BullModule.registerQueue(
      {
        name: BullQueues.STATS,
      },
      {
        name: BullQueues.USER_DATA,
      },
      {
        name: 'profitwell',
      },
      {
        name: BullQueues.REVENUE_CAT_STATUS,
      },
    ),
    R2Module.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): any => configService.get('r2'),
    }),
    OpenAIModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): any => configService.get('openai'),
    }),
    SendGridModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): ISendGridOptions => configService.get('sendGrid'),
    }),
    PusherModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): IPusherOptions => configService.get('pusher'),
    }),
    PusherBeamsModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): IPusherBeamsOptions => configService.get('pusher-beams'),
    }),
    ActivityModule,
    forwardRef(() => AuthModule),
    ConfigModule,
    SubscriptionModule,
    HabitPackModule,
    FocusModeTemplatesModule,
    forwardRef(() => DeviceModule),
    HelperModule,
    BrevoModule,
    ToDoModule,
    PlatformIntegrationsModule,
  ],
  controllers: [
    UserSettingsController,
    UserController,
    UserLocalDeviceSettingsController,
    UserDataController,
    UserStatsController,
    UserFeedbackController,
  ],
})
export class UserModule {}
