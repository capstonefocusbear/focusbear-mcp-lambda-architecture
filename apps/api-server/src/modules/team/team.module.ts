import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ISendGridOptions, SendGridModule } from '../../../../../libs/send-grid/src';
import { JwtModule } from '../../../../../libs/jwt/src';
import { IJwtOptions } from '../../../../../libs/jwt/src/interfaces';
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
    SendGridModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): ISendGridOptions => configService.get('sendGrid'),
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): IJwtOptions => configService.get('tokens.invitation'),
    }),
  ],
})
export class TeamModule {}
