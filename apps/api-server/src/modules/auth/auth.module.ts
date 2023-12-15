import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Auth0Module } from '@app/auth0';
import { IPusherBeamsOptions, PusherBeamsModule } from '@app/pusher-beams';
import { IPusherOptions, PusherModule } from '@app/pusher';
import { JwtModule } from '@nestjs/jwt';
import { BullModule } from '@nestjs/bull';
import { AuthService } from './services/auth.service';
import { IsAuth } from './guards/is-auth/is-auth.guard';
import { HelperModule } from '../helper/helper.module';
import { HasAuth0ActionSecret } from './guards/has-auth0-action-secret/has-auth0-action-secret.guard';
import { PusherAuthController } from './controllers/pusher-auth.controller';
import { PusherBeamsAuthService } from './services/pusher-beams-auth.service';
import { UserRepository } from '../user/repositories/user.repository';
import { IsAdmin } from './guards/is-admin/is-admin.guard';
import { ZohoAuthService } from './services/zoho-auth.service';
import { AuthController } from './controllers/auth.controller';
import { MondayAuthService } from './services/monday-auth.service';
import { PlatformIntegrationsModule } from '../platform-integrations/platform-integrations.module';
import { JiraAuthService } from './services/jira-auth.service';
import { AsanaAuthService } from './services/asana-auth.service';
import { ClickUpAuthService } from './services/clickup-auth.service';
import { TrelloAuthService } from './services/trello-auth.service';
import { AuthServiceFactory } from './services/auth.service.factory';
import { GoogleAuthService } from './services/google-auth.service';
import { MicrosoftAuthService } from './services/microsoft-auth.service';

@Module({
  providers: [
    AuthService,
    IsAuth,
    HasAuth0ActionSecret,
    PusherBeamsAuthService,
    UserRepository,
    IsAdmin,
    ZohoAuthService,
    MondayAuthService,
    JiraAuthService,
    AsanaAuthService,
    ClickUpAuthService,
    TrelloAuthService,
    GoogleAuthService,
    MicrosoftAuthService,
    AuthServiceFactory,
  ],
  exports: [
    IsAuth,
    IsAdmin,
    AuthService,
    HasAuth0ActionSecret,
    ZohoAuthService,
    MondayAuthService,
    JiraAuthService,
    AsanaAuthService,
    ClickUpAuthService,
    TrelloAuthService,
  ],
  controllers: [PusherAuthController, AuthController],
  imports: [
    Auth0Module.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): any => configService.get('auth0'),
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
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => configService.get('tokens.invitation'),
    }),
    HelperModule,
    ConfigModule,
    PlatformIntegrationsModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => config.get('bull'),
    }),
    BullModule.registerQueue({
      name: 'time-logs',
    }),
  ],
})
export class AuthModule {}
