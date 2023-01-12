import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { R2Service } from '../../../../../../libs/r2/src/services/r2.service';
import { UserRepository } from '../../user/repositories/user.repository';
import { FOCUS_MUSIC_BUCKET } from '../domain/tracks.constants';
import { TrackResponseDto } from '../dto/track-response.dto';
import { UpsertTrackDto } from '../dto/upsert-track.dto';
import { Track } from '../entities/track.entity';
import { TracksRepository } from '../repositories/tracks.repository';

@Injectable()
export class TracksService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly tracksRepository: TracksRepository,
    @InjectSentry() private readonly sentryService: SentryService,
    private readonly r2Service: R2Service,
  ) {}

  async getAllTracks(user_id: string): Promise<TrackResponseDto[]> {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Fetching all tracks',
      });
      const user = await this.userRepository.orm.findOneBy({ id: user_id });
      if (!user) throw new NotFoundException(`User with ID: ${user_id} does not exist!`);
      const tracks = await this.tracksRepository.orm.find();
      return await Promise.all(
        tracks.map(async ({ id, name, artist, description, file_name }) => {
          const downloadUrl = await this.r2Service.getPresignedUrl(FOCUS_MUSIC_BUCKET, file_name);
          if (!downloadUrl) return;
          const trackData: TrackResponseDto = { id, name, artist, description, download_url: downloadUrl };
          return trackData;
        }),
      );
    } catch (error) {
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
      throw error;
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
      throw error;
    }
  }
}
