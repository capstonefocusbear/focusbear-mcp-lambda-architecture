import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { ActivityChoiceData } from './activity-choice-data.model';
import { ActivityChoiceType } from './activity-choice-type.enum';

export class ActivityData {
  @IsNotEmpty()
  @IsString()
  @ApiProperty()
  name: string;

  @IsNotEmpty()
  @IsInt()
  @ApiProperty()
  duration_seconds: number;

  @IsArray()
  @IsOptional()
  @ValidateIf((o) => o.video_urls?.length > 0)
  @IsString({ each: true })
  @IsUrl({}, { each: true })
  @ApiProperty()
  video_urls?: string[];

  @IsBoolean()
  @IsOptional()
  @ApiProperty()
  include_in_every_break?: boolean;

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

  @IsEnum(ActivityChoiceType)
  @IsIn(Object.values(ActivityChoiceType))
  @IsOptional()
  @ApiProperty({ enum: ActivityChoiceType })
  choice_type?: ActivityChoiceType;

  @IsArray()
  @IsOptional()
  @ValidateIf((o) => o.choices?.length > 0)
  @ValidateNested({ each: true })
  @Type(() => ActivityChoiceData)
  @ApiProperty({ isArray: true, type: ActivityChoiceData })
  choices?: ActivityChoiceData[];

  @IsArray()
  @IsOptional()
  @ValidateIf((o) => o.allowed_apps?.length > 0)
  @IsString({ each: true })
  @ApiProperty()
  allowed_apps?: string[];

  @IsArray()
  @IsOptional()
  @ValidateIf((o) => o.allowed_urls?.length > 0)
  @IsString({ each: true })
  @IsUrl({}, { each: true })
  @ApiProperty()
  allowed_urls?: string[];
}
