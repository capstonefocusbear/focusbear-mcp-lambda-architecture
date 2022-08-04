import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { IRevenueCatOptions, RevenueCatModule } from '../../../../../libs/revenue-cat/src';
import { UserModule } from '../user/user.module';
import { TeamManagementController } from './controllers/team-management.controller';
import { TeamRepository } from './repositories/team.repository';
import { TeamManagementService } from './services/team-management/team-management.service';

@Module({
  providers: [TeamRepository, TeamManagementService],
  exports: [TeamRepository],
  controllers: [TeamManagementController],
  imports: [
    forwardRef(() => UserModule),
    ConfigModule,
    RevenueCatModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): IRevenueCatOptions => configService.get('revenueCat'),
    }),
  ],
})
export class TeamModule {}
