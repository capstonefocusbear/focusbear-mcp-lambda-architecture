import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { OpenAIModule } from '../../../../../libs/openai/src';
import { ActivityModule } from '../activity/activity.module';
import { Auth0Module } from '../../../../../libs/auth0/src';
import { AuthModule } from '../auth/auth.module';
import { UserSettingsController } from './controllers/user-settings/user-settings.controller';
import { UserController } from './controllers/user/user.controller';
import { User } from './entities/user.entity';
import { UserRepository } from './repositories/user.repository';
import { UserSettingsService } from './services/user-settings/user-settings.service';
import { UserService } from './services/user/user.service';
import { IRevenueCatOptions, RevenueCatModule } from '../../../../../libs/revenue-cat/src';
import { SubscriptionModule } from '../subscription/subscription.module';
import { UserLocalDeviceSettingsController } from './controllers/user-local-device-settings/user-local-device-settings.controller';
import { IStripeOptions, StripeModule } from '../../../../../libs/stripe/src';
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
import { R2Module } from '../../../../../libs/r2/src/r2.module';
import { ISendGridOptions, SendGridModule } from '../../../../../libs/send-grid/src';

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
        name: 'stats',
      },
      {
        name: 'user-data',
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
    ActivityModule,
    AuthModule,
    ConfigModule,
    SubscriptionModule,
    HabitPackModule,
    FocusModeTemplatesModule,
    DeviceModule,
    HelperModule,
  ],
  controllers: [
    UserSettingsController,
    UserController,
    UserLocalDeviceSettingsController,
    UserDataController,
    UserStatsController,
  ],
})
export class UserModule {}
