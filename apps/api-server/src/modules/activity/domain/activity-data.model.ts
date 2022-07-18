import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  ValidateIf,
} from 'class-validator';
import { ActivityChoiceType } from './activity-choice-type.enum';

export class ActivityData {
  @IsNotEmpty()
  @IsString()
  @ApiProperty()
  name: string;

  @IsBoolean()
  @IsOptional()
  @ApiProperty()
  is_office_friendly?: boolean;

  @IsUUID('4')
  @IsOptional()
  @ApiProperty()
  allowed_focus_mode_id?: string;

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
