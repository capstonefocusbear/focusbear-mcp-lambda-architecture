import { Type } from 'class-transformer';
import { IsDate, IsNotEmpty, IsOptional, IsString, MaxDate } from 'class-validator';

export class FinishFocusModeDto {
  @IsOptional()
  @IsString()
  achievements?: string;

  @IsOptional()
  @IsString()
  distractions?: string;

  @IsNotEmpty()
  @MaxDate(new Date(Date.now()), { message: `finish_time should be lesser than now: ${new Date()}` })
  @Type(() => Date)
  @IsDate({ message: 'finish_time  should be a valid ISO string in UTC zone' })
  finish_time: Date;
}
