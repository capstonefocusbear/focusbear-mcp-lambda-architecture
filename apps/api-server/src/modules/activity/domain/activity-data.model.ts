import { IsArray, IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, IsUrl, ValidateNested } from 'class-validator';

export class ActivityData {
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
  @IsOptional()
  include_in_every_break?: boolean;

  @IsBoolean()
  log_quantity?: boolean;

  @IsString()
  log_quantity_question?: string;

  @IsArray()
  @ValidateNested({ each: true })
  choices?: Partial<ActivityData>[];

  @IsArray()
  @IsString({ each: true })
  allowed_apps?: string[];
}
