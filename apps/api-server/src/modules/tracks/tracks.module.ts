import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { R2Module } from '@app/r2/r2.module';
import { UserModule } from '../user/user.module';
import { TracksController } from './controllers/tracks.controller';
import { TracksRepository } from './repositories/tracks.repository';
import { TracksService } from './services/tracks.service';

@Module({
  providers: [TracksService, TracksRepository],
  exports: [],
  imports: [
    R2Module.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): any => configService.get('r2'),
    }),
    UserModule,
  ],
  controllers: [TracksController],
})
export class TracksModule {}
