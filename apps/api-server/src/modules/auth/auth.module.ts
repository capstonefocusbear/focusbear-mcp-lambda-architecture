import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Auth0Module } from '../../../../../libs/auth0/src';
import { AuthService } from './services/auth.service';
import { IsAuth } from './guards/is-auth.guard';
import { HelperModule } from '../helper/helper.module';

@Module({
  providers: [AuthService, IsAuth],
  exports: [IsAuth, AuthService],
  imports: [
    Auth0Module.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): any => configService.get('auth0'),
    }),
    HelperModule,
  ],
})
export class AuthModule {}
