import { Type } from 'class-transformer';
import { IsDate, IsNotEmpty, IsOptional, IsString, MaxDate, MinDate } from 'class-validator';

export class StartFocusModeDto {
  @IsOptional()
  @IsString()
  intention?: string;

  @IsNotEmpty()
  @MinDate(new Date(), { message: `finish_time should be greater than now: ${new Date()}}` })
  @Type(() => Date)
  @IsDate({ message: 'finish_time  should be a valid ISO string in UTC zone' })
  finish_time: Date;

  @IsNotEmpty()
  @MaxDate(new Date(), { message: `finish_time should be lesser than now: ${new Date()}}` })
  @Type(() => Date)
  @IsDate({ message: 'start_time  should be a valid ISO string in UTC zone' })
  start_time: Date;
}
