import { Type } from 'class-transformer';
import { IsArray, IsDate, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';
import { CreateFocusModeTagDto } from './create-focus-mode-tag.dto';
import { ToDoTimeLogDto } from '../../to-do/dto/to-do-time-log.dto.ts';

export class FinishFocusModeDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  achievements?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  distractions?: string;

  @IsNotEmpty()
  @Type(() => Date)
  @IsDate({ message: 'finish_time  should be a valid ISO string in UTC zone' })
  finish_time: Date;

  @IsOptional()
  @IsNumber()
  focus_duration_seconds?: number;

  @IsOptional()
  @IsArray()
  tags?: CreateFocusModeTagDto[];

  @IsOptional()
  @IsArray()
  to_dos?: ToDoTimeLogDto[];

  @IsOptional()
  metadata?: any;
}
