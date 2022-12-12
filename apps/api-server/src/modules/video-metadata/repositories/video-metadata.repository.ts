import { Injectable } from '@nestjs/common';
import { Connection } from 'typeorm';
import { BaseRepository } from '../../../shared/repositories/base-repository.repository';
import { VideoMetadata } from '../entities/video-metadata.entity';

@Injectable()
export class VideoMetadataRepository extends BaseRepository<VideoMetadata> {
  constructor(private readonly connection: Connection) {
    super(connection, VideoMetadata);
  }

  async fetchVideoIds(video_ids: string[]) {
    const videosMetadata = await this.orm
      .createQueryBuilder('video_metadata')
      .select(['video_metadata.id'])
      .where('video_metadata.id IN (:...video_ids)', { video_ids })
      .getMany();

    return videosMetadata.map((video) => video.id);
  }
}
