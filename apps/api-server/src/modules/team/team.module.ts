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
