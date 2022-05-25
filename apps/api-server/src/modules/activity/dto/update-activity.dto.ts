import { IsNotEmpty, IsString, IsInt, IsArray, IsUrl, IsBoolean, ValidateNested } from 'class-validator';
import { ActivityData } from '../domain/activity-data.model';

export class UpdateActivityDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsInt()
  duration_seconds: number;

  @IsArray()
  @IsUrl({ each: true })
  video_urls: string[] = [];

  @IsBoolean()
  include_in_every_break?: boolean;

  @IsBoolean()
  log_quantity?: boolean;

  @IsString()
  log_quantity_question?: string;

  @IsArray()
  @ValidateNested({ each: true })
  choices?: Partial<ActivityData>[];
}
