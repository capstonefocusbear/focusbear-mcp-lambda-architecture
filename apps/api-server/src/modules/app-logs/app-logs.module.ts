import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { R2Module } from '@app/r2';
import { Auth0Module } from '@app/auth0';
import { AppLogsController } from './controllers/app-logs.controller';
import { AppLogsService } from './services/app-logs.service';
import { UserModule } from '../user/user.module';

@Module({
  controllers: [AppLogsController],
  providers: [AppLogsService],
  imports: [
    R2Module.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): any => configService.get('r2'),
    }),
    Auth0Module.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): any => configService.get('auth0'),
    }),
    UserModule,
  ],
})
export class AppLogsModule {}
