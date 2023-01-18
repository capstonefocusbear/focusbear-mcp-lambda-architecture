import { IsNotEmpty, IsString, IsOptional, IsUUID, IsNumber } from 'class-validator';

export class TrackResponseDto {
  @IsOptional()
  @IsUUID('4')
  id: string;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  artist?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty()
  @IsString()
  download_url: string;

  @IsOptional()
  @IsString()
  thumbnail_download_url?: string;

  @IsOptional()
  @IsNumber()
  duration?: number;
}
