import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsNotEmpty, IsOptional, IsString, IsUrl, ValidateIf } from 'class-validator';

export class ActivityChoiceData {
  @IsNotEmpty()
  @IsString()
  @ApiProperty()
  name: string;

  @IsBoolean()
  @IsOptional()
  @ApiProperty()
  log_quantity?: boolean;

  @IsString()
  @IsOptional()
  @ValidateIf((o) => !!o.log_quantity)
  @IsNotEmpty()
  @ApiProperty()
  log_quantity_question?: string;

  @IsArray()
  @IsOptional()
  @ValidateIf((o) => o.video_urls?.length > 0)
  @IsString({ each: true })
  @IsUrl({}, { each: true })
  @ApiProperty()
  video_urls?: string[];
}
