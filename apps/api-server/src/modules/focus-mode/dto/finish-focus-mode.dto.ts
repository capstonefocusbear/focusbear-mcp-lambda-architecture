import { Type } from 'class-transformer';
import { IsArray, IsDate, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { CreateFocusModeTagDto } from './create-focus-mode-tag.dto';
import { ToDoTimeLogDto } from '../../to-do/dto/to-do-time-log.dto.ts';
// import { IsTimestampLesserThanNow } from '../../activity/dto/create-completed-activity.dto';

export class FinishFocusModeDto {
  @IsOptional()
  @IsString()
  achievements?: string;

  @IsOptional()
  @IsString()
  distractions?: string;

  @IsNotEmpty()
  // @IsTimestampLesserThanNow(null, { message: 'finish_time should be lesser than NOW!' })
  @Type(() => Date)
  @IsDate({ message: 'finish_time  should be a valid ISO string in UTC zone' })
  finish_time: Date;

  @IsOptional()
  @IsNumber()
  focus_duration_seconds?: number;

  @IsOptional()
  @IsArray()
  tags?: CreateFocusModeTagDto[];

  to_dos?: ToDoTimeLogDto[];
}
