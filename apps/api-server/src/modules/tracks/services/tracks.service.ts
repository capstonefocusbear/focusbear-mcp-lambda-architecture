import { Injectable } from '@nestjs/common';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { UpsertTrackDto } from '../dto/upsert-track.dto';
import { Track } from '../entities/track.entity';
import { TracksRepository } from '../repositories/tracks.repository';

@Injectable()
export class TracksService {
  constructor(
    private readonly tracksRepository: TracksRepository,
    @InjectSentry() private readonly sentryService: SentryService,
  ) {}

  async getAllTracks(): Promise<Track[]> {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Fetching all tracks',
      });
      return await this.tracksRepository.orm.find();
    } catch (error) {
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
    }
  }

  async upsertTrack(track: UpsertTrackDto): Promise<Track> {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Upserting track',
        data: {
          track,
        },
      });
      return await this.tracksRepository.upsert(track, ['id']);
    } catch (error) {
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
    }
  }
}
