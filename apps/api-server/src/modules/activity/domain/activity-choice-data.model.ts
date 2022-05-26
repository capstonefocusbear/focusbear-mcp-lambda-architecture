import { IsArray, IsBoolean, IsNotEmpty, IsOptional, IsString, IsUrl, ValidateIf } from 'class-validator';

export class ActivityChoiceData {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsBoolean()
  @IsOptional()
  log_quantity?: boolean;

  @IsArray()
  @IsOptional()
  @ValidateIf((o) => o.video_urls?.length > 0)
  @IsString({ each: true })
  @IsUrl({}, { each: true })
  video_urls?: string[];
}
