import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { R2Module } from '@app/r2';
import { AppLogsController } from './controllers/app-logs.controller';
import { AppLogsService } from './services/app-logs.service';

@Module({
  controllers: [AppLogsController],
  providers: [AppLogsService],
  imports: [
    R2Module.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): any => configService.get('r2'),
    }),
  ],
})
export class AppLogsModule {}
