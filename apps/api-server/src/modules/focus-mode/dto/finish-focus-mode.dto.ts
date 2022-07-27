import { Type } from 'class-transformer';
import { IsDate, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { IsTimestampLesserThanNow } from '../../activity/dto/create-completed-activity.dto';

export class FinishFocusModeDto {
  @IsOptional()
  @IsString()
  achievements?: string;

  @IsOptional()
  @IsString()
  distractions?: string;

  @IsNotEmpty()
  @IsTimestampLesserThanNow(null, { message: 'finish_time should be lesser than NOW!' })
  @Type(() => Date)
  @IsDate({ message: 'finish_time  should be a valid ISO string in UTC zone' })
  finish_time: Date;
}
