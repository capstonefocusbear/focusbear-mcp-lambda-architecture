/* eslint-disable */
import { IsInt, IsNotEmpty, IsUUID, Max, Min } from 'class-validator';

export class GetCompletedActivityStatsQueryDto {
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  @Max(180)
  days_number: number = 30; // default value
}

export class GetCompletedActivityStatsParamsDto {
  @IsNotEmpty()
  @IsUUID('4')
  activity_id: string;
}
