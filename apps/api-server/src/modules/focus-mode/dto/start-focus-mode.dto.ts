import { Type } from 'class-transformer';
import { IsDate, IsNotEmpty, IsOptional, IsString, MaxDate, MinDate } from 'class-validator';

export class StartFocusModeDto {
  @IsOptional()
  @IsString()
  intention?: string;

  @IsNotEmpty()
  @MinDate(new Date(Date.now()), { message: 'finish_time should be greater than now' })
  @Type(() => Date)
  @IsDate({ message: 'finish_time should be a valid UTC string or unix-time number' })
  finish_time: Date;

  @IsNotEmpty()
  @MaxDate(new Date(Date.now()), { message: 'start_time should be lesser than now than now' })
  @Type(() => Date)
  @IsDate({ message: 'start_time should be a valid UTC string or unix-time number' })
  start_time: Date;
}
