import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectSentry, SentryService } from '@app/observability';
import { R2Service } from '@app/r2/services/r2.service';
import { UserRepository } from '../../user/repositories/user.repository';
import { FOCUS_MUSIC_BUCKET, TRACK_THUMBNAILS_BUCKET } from '../domain/tracks.constants';
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
      const tracksWithDownloadUrls = await Promise.all(
        tracks.map(async ({ id, name, artist, description, file_name, thumbnail_file_name, duration }) => {
          if (!file_name) return null;
          const downloadUrl = await this.r2Service.getPresignedUrl(FOCUS_MUSIC_BUCKET, file_name);
          let thumbnailDownloadUrl: string;
          if (thumbnail_file_name) {
            thumbnailDownloadUrl = await this.r2Service.getPresignedUrl(TRACK_THUMBNAILS_BUCKET, thumbnail_file_name);
          }
          const trackData: TrackResponseDto = {
            id,
            name,
            artist,
            description,
            download_url: downloadUrl,
            thumbnail_download_url: thumbnailDownloadUrl,
            duration,
          };
          return trackData;
        }),
      );
      return tracksWithDownloadUrls.filter((track) => track !== null);
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
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
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }
}
