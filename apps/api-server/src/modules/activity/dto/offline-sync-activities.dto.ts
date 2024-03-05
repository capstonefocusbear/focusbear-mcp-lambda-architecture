import { IsArray, IsOptional, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { CreateSkippedActivityDto } from './create-skipped-activity.dto';

export class OfflineSyncActivitiesDto {
  @ApiProperty()
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSkippedActivityDto)
  completed_activites: CreateSkippedActivityDto[];

  @ApiProperty()
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSkippedActivityDto)
  completed_activities: CreateSkippedActivityDto[];
}
