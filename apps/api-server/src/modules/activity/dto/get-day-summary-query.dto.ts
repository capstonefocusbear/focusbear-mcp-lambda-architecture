import { IsNotEmpty, IsString } from 'class-validator';

export class GetDaySummaryQueryDto {
  @IsNotEmpty()
  @IsString()
  timezone: string = 'UTC'; // default value
}
