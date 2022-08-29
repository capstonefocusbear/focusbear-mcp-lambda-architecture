import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateIf,
} from 'class-validator';
import { LogSummaryType } from './log-summary-type.enum';

export class ActivityChoiceData {
  @IsNotEmpty()
  @IsUUID('4')
  @ApiProperty()
  id: string;

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

  @IsEnum(LogSummaryType)
  @IsIn(Object.values(LogSummaryType))
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
  @ValidateIf((o) => o.allowed_urls?.length > 0)
  @IsString({ each: true })
  @ApiProperty()
  allowed_urls?: string[];
}
