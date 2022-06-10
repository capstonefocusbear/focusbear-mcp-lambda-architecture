/* eslint-disable max-classes-per-file */
import { IsInt, IsNotEmpty, IsUUID, Max } from 'class-validator';

export class GetCompletedActivityStatsQueryDto {
  @IsNotEmpty()
  @IsInt()
  @Max(180)
  days_number = 30; // default value
}

export class GetCompletedActivityStatsParamsDto {
  @IsNotEmpty()
  @IsUUID('4')
  activity_id: string;
}
