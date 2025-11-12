import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ISendGridOptions, SendGridModule } from '@app/send-grid';
import { IJwtOptions } from '@app/jwt/interfaces';
import { JwtModule } from '@app/jwt';
import { Auth0Module } from '@app/auth0';
import { UserModule } from '../user/user.module';
import { NotificationModule } from '../notification/notification.module';
import { AccountabilityBuddyController } from './controllers/accountability-buddy.controller';
import { AccountabilityBuddyRepository } from './repositories/accountability-buddy.repository';
import { UnlockRequestRepository } from './repositories/unlock-request.repository';
import { AccountabilityBuddyService } from './services/accountability-buddy.service';
import { UnlockRequestService } from './services/unlock-request.service';
import { AccountabilityTokenService } from './services/accountability-token.service';
import { AccountabilityEmailService } from './services/accountability-email.service';
import { AccountabilityNotificationService } from './services/accountability-notification.service';

@Module({
  providers: [
    AccountabilityBuddyRepository,
    UnlockRequestRepository,
    AccountabilityBuddyService,
    UnlockRequestService,
    AccountabilityTokenService,
    AccountabilityEmailService,
    AccountabilityNotificationService,
  ],
  exports: [AccountabilityBuddyRepository, UnlockRequestRepository, AccountabilityBuddyService, UnlockRequestService],
  controllers: [AccountabilityBuddyController],
  imports: [
    forwardRef(() => UserModule),
    forwardRef(() => NotificationModule),
    ConfigModule,
    SendGridModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): ISendGridOptions => configService.get('sendGrid'),
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): IJwtOptions =>
        configService.get('tokens.accountability_buddy_invitation'),
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): IJwtOptions => configService.get('tokens.unlock_request_approval'),
    }),
    Auth0Module.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): any => configService.get('auth0'),
    }),
  ],
})
export class AccountabilityBuddyModule {}
