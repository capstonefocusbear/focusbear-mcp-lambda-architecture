import { IsNotEmpty, IsString, IsOptional, IsUUID } from 'class-validator';

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
}
