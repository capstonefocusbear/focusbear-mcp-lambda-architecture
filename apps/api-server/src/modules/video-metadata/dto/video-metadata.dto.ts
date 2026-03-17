export class VideoMetadataDto {
  id: string;

  video_url: string;

  title: string;

  duration: string;

  thumbnail_url: string | null = null;

  thumbnail_width: number | null = null;

  thumbnail_height: number | null = null;
}
