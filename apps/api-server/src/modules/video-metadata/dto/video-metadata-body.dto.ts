import { IsNotEmpty, IsArray } from 'class-validator';

export class VideoMetadataBodyDto {
  @IsNotEmpty()
  @IsArray()
  video_urls: string[];
}
