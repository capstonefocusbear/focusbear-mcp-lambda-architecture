import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HabitPackController } from './controllers/habit-pack.controller';
import { HabitPackService } from './services/habit-pack/habit-pack.service';
import { HabitPackRepository } from './repositories/habit-pack.repository';
import { UserModule } from '../user/user.module';
import { ActivityTemplateModule } from '../activity-template/activty-template.module';
import { HabitPack } from './entity/habit-pack.entity';
import { HabitPackManagerService } from './services/habit-pack/habit-pack-manager.service';
import { UserSettingsService } from '../user/services/user-settings/user-settings.service';
import { ActivityParserService } from '../activity/services/activity-parser/activity-parser.service';
import { ActivitySequenceRepository } from '../activity/repositories/activity-sequence.repository';
import { InstalledPackService } from './services/installed-packs/installed-pack.service';
import { InstalledPack } from './entity/installed-pack.entity';
import { InstalledPackRepository } from './repositories/installed-pack.repository';
import { ActivityTemplateRepository } from '../activity-template/repository/activity-template.repository';
import { ActivityRepository } from '../activity/repositories/activity.repository';
import { UserService } from '../user/services/user/user.service';
import { Auth0Module } from '../../../../../libs/auth0/src';
import { IRevenueCatOptions, RevenueCatModule } from '../../../../../libs/revenue-cat/src';
import { IStripeOptions, StripeModule } from '../../../../../libs/stripe/src';
import { UserRepository } from '../user/repositories/user.repository';

@Module({
  providers: [
    HabitPackRepository,
    HabitPackService,
    HabitPackManagerService,
    UserSettingsService,
    ActivityParserService,
    ActivitySequenceRepository,
    ActivityTemplateRepository,
    InstalledPackService,
    InstalledPackRepository,
    ActivityRepository,
    UserService,
    ConfigService,
    UserRepository,
  ],
  imports: [
    TypeOrmModule.forFeature([HabitPack]),
    TypeOrmModule.forFeature([InstalledPack]),
    forwardRef(() => UserModule),
    forwardRef(() => ActivityTemplateModule),
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
  ],
  controllers: [HabitPackController],
})
export class HabitPackModule {}
