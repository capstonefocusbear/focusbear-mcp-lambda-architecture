import { VideoMetadataDto } from './video-metadata.dto';

export class VideoMetadataResponseDto {
  videos_metadata: VideoMetadataDto[];

  invalid_urls: string[];
}
