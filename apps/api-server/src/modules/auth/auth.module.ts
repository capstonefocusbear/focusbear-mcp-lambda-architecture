import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { IPusherBeamsOptions, PusherBeamsModule } from '../../../../../libs/pusher-beams/src';
import { Auth0Module } from '../../../../../libs/auth0/src';
import { AuthService } from './services/auth.service';
import { IsAuth } from './guards/is-auth/is-auth.guard';
import { HelperModule } from '../helper/helper.module';
import { HasAuth0ActionSecret } from './guards/has-auth0-action-secret/has-auth0-action-secret.guard';
import { IPusherOptions, PusherModule } from '../../../../../libs/pusher/src';
import { PusherAuthController } from './controllers/pusher-auth.controller';
import { PusherBeamsAuthService } from './services/pusher-beams-auth.service';
import { UserRepository } from '../user/repositories/user.repository';
import { IsAdmin } from './guards/is-admin/is-admin.guard';

@Module({
  providers: [AuthService, IsAuth, HasAuth0ActionSecret, PusherBeamsAuthService, UserRepository, IsAdmin],
  exports: [IsAuth, IsAdmin, AuthService, HasAuth0ActionSecret],
  controllers: [PusherAuthController],
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
    HelperModule,
    ConfigModule,
  ],
})
export class AuthModule {}
