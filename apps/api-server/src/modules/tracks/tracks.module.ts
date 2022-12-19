import { Module } from '@nestjs/common';
import { TracksController } from './controllers/tracks.controller';
import { TracksRepository } from './repositories/tracks.repository';
import { TracksService } from './services/tracks.service';

@Module({
  providers: [TracksService, TracksRepository],
  exports: [],
  controllers: [TracksController],
})
export class TracksModule {}
