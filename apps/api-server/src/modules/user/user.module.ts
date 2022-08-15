import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
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
import { UserSubscriber } from './repositories/user.subscriber';
import { UserLocalDeviceSettingsController } from './controllers/user-local-device-settings/user-local-device-settings.controller';
import { IStripeOptions, StripeModule } from '../../../../../libs/stripe/src';

@Module({
  providers: [UserSettingsService, UserRepository, UserService, UserSubscriber],
  exports: [UserRepository],
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
    ActivityModule,
    AuthModule,
    ConfigModule,
    SubscriptionModule,
  ],
  controllers: [UserSettingsController, UserController, UserLocalDeviceSettingsController],
})
export class UserModule {}
