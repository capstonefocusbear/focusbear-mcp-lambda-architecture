import { IsNotEmpty, IsString, IsOptional, IsUUID, IsNumber } from 'class-validator';

export class UpsertTrackDto {
  @IsOptional()
  @IsUUID('4')
  id?: string;

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
  file_name: string;

  @IsOptional()
  @IsString()
  thumbnail_file_name?: string;

  @IsOptional()
  @IsNumber()
  duration?: number;
}
