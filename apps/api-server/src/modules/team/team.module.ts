import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { IRevenueCatOptions, RevenueCatModule } from '@app/revenue-cat';
import { ISendGridOptions, SendGridModule } from '@app/send-grid';
import { IJwtOptions } from '@app/jwt/interfaces';
import { JwtModule } from '@app/jwt';
import { IStripeOptions, StripeModule } from '@app/stripe';
import { UserModule } from '../user/user.module';
import { TeamManagementController } from './controllers/team-management.controller';
import { ServiceAccountTeamManagementController } from './controllers/service-account-team-management.controller';
import { TeamRepository } from './repositories/team.repository';
import { TeamManagementService } from './services/team-management/team-management.service';
import { Auth0Module } from '../../../../../libs/auth0/src';
import { TeamToMemberRepository } from './repositories/team-to-member.repository';
import { TeamToAdminRepository } from './repositories/team-to-admin.repository';

@Module({
  providers: [TeamRepository, TeamManagementService, TeamToMemberRepository, TeamToAdminRepository],
  exports: [TeamRepository, TeamManagementService],
  controllers: [TeamManagementController, ServiceAccountTeamManagementController],
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
    StripeModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): IStripeOptions => configService.get('stripeConfig'),
    }),
  ],
})
export class TeamModule {}
