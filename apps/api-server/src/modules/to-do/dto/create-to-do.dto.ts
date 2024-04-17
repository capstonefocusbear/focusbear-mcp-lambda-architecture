import { IsArray, IsDate, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
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
  status?: string;

  @IsOptional()
  @IsArray()
  tags?: CreateFocusModeTagDto[];

  subtasks?: SubtaskDto[];

  @IsOptional()
  objective?: string;

  @IsOptional()
  duration?: number;

  @IsOptional()
  icon?: string;
}
