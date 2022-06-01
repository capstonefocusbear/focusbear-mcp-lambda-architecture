import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Auth0Module } from '../../../../../libs/auth0/src';
import { AuthService } from './services/auth.service';
import { IsAuth } from './guards/is-auth/is-auth.guard';
import { HelperModule } from '../helper/helper.module';
import { HasAuth0ActionSecret } from './guards/has-auth0-action-secret/has-auth0-action-secret.guard';

@Module({
  providers: [AuthService, IsAuth, HasAuth0ActionSecret],
  exports: [IsAuth, AuthService, HasAuth0ActionSecret],
  imports: [
    Auth0Module.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): any => configService.get('auth0'),
    }),
    HelperModule,
    ConfigModule,
  ],
})
export class AuthModule {}
