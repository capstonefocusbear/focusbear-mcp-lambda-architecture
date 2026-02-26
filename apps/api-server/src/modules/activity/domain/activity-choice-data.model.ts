import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  ValidateIf,
} from 'class-validator';
import { LogSummaryType } from './log-summary-type.enum';
import { LogQuantityQuestion } from '../entities/log-quantity-questions';

export class ActivityChoiceData {
  @IsNotEmpty()
  @IsUUID('4')
  @ApiProperty()
  id: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty()
  name: string;

  @IsOptional()
  @IsString()
  @ApiProperty()
  completion_requirements?: string;

  @IsBoolean()
  @IsOptional()
  @ApiProperty()
  log_quantity?: boolean;

  @IsString()
  @IsOptional()
  @ApiProperty()
  log_quantity_question?: string;

  @IsArray()
  @IsOptional()
  @ApiProperty()
  log_quantity_questions?: LogQuantityQuestion[];

  // @IsEnum(LogSummaryType)
  @IsIn([...Object.values(LogSummaryType), ''])
  @IsOptional()
  @ApiProperty({ enum: LogSummaryType })
  log_summary_type?: LogSummaryType;

  @IsArray()
  @IsOptional()
  @ValidateIf((o) => o.video_urls?.length > 0)
  @IsString({ each: true })
  // @IsUrl({}, { each: true })
  @ApiProperty()
  video_urls?: string[];

  @IsArray()
  @IsOptional()
  @ValidateIf((o) => o.allowed_apps?.length > 0)
  @IsString({ each: true })
  @ApiProperty()
  allowed_apps?: string[];

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  @ApiProperty()
  allowed_mobile_apps?: string[];

  @IsArray()
  @IsOptional()
  @ValidateIf((o) => o.allowed_urls?.length > 0)
  @IsString({ each: true })
  @ApiProperty()
  allowed_urls?: string[];

  @IsOptional()
  @IsNumber()
  competency_level?: number;

  @IsOptional()
  @IsUUID('4')
  activity_template_id?: string;

  @IsOptional()
  @IsUUID('4')
  linked_activity_id?: string;

  @IsOptional()
  @IsUUID('4')
  linked_activity_template_id?: string;

  @IsOptional()
  @IsString()
  habit_icon?: string;

  @IsOptional()
  @IsUUID('4')
  @ApiProperty({ required: false, nullable: true })
  geofence_id?: string | null;
}
