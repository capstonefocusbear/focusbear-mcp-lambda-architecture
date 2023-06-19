import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { IRevenueCatOptions, RevenueCatModule } from '@app/revenue-cat';
import { ISendGridOptions, SendGridModule } from '@app/send-grid';
import { IJwtOptions } from '@app/jwt/interfaces';
import { JwtModule } from '@app/jwt';
import { UserModule } from '../user/user.module';
import { TeamManagementController } from './controllers/team-management.controller';
import { TeamRepository } from './repositories/team.repository';
import { TeamManagementService } from './services/team-management/team-management.service';
import { Auth0Module } from '../../../../../libs/auth0/src';

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
    Auth0Module.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): any => configService.get('auth0'),
    }),
  ],
})
export class TeamModule {}
