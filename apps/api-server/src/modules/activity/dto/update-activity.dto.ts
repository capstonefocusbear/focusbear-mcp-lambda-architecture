import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsIn, IsInt, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';
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
}
