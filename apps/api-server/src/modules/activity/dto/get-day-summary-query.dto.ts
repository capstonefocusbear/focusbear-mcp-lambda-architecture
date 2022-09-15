import { IsNotEmpty, IsString } from 'class-validator';

/* eslint-disable */
export class GetDaySummaryQueryDto {
  @IsNotEmpty()
  @IsString()
  timezone: string = 'UTC'; // default value
}
