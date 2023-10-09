import {
  IsArray,
  IsDate,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ToDoStatus } from '../domain/to-do-status.enum';
import { CreateFocusModeTagDto } from '../../focus-mode/dto/create-focus-mode-tag.dto';
import { SubtaskDto } from './subtask.dto';

export class CreateToDoDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsNotEmpty()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  details: string;

  @IsOptional()
  @IsDate()
  due_date?: Date;

  @IsOptional()
  @IsUUID()
  focus_type?: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Max(4)
  eisenhower_quadrant: number;

  @IsOptional()
  @IsEnum(ToDoStatus)
  @IsIn(Object.values(ToDoStatus))
  @ApiProperty({ enum: ToDoStatus })
  status?: ToDoStatus;

  @IsOptional()
  @IsArray()
  tags?: CreateFocusModeTagDto[];

  subtasks?: SubtaskDto[];
}
