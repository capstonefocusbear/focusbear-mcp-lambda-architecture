import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { ActivityChoiceData } from '../domain/activity-choice-data.model';
import { ActivityData } from '../domain/activity-data.model';
import { LogSummaryType } from '../domain/log-summary-type.enum';

export class UpdateActivityDto extends ActivityData {
  @IsNotEmpty()
  @IsUUID('4')
  id: string;

  @IsBoolean()
  @IsOptional()
  @ApiProperty()
  log_quantity?: boolean;

  @IsNotEmpty()
  @IsInt()
  @ApiProperty()
  duration_seconds: number;

  @IsEnum(LogSummaryType)
  @IsIn(Object.values(LogSummaryType))
  @IsOptional()
  @ApiProperty({ enum: LogSummaryType })
  log_summary_type?: LogSummaryType;

  @IsArray()
  @IsOptional()
  @ArrayMinSize(1)
  @ValidateIf((o) => o.choices?.length > 0)
  @ValidateNested({ each: true })
  @Type(() => ActivityChoiceData)
  @ApiProperty({ isArray: true, type: ActivityChoiceData })
  choices?: ActivityChoiceData[];
}
