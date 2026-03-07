import {
  IsArray,
  IsDate,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
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
  details?: string;

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

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubtaskDto)
  subtasks?: SubtaskDto[];

  @IsOptional()
  objective?: string;

  @IsOptional()
  duration?: number;

  @IsOptional()
  icon?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  perspiration_level?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  outcome?: number;

  @IsOptional()
  @IsUUID()
  project_id?: string;

  @IsOptional()
  @IsUUID()
  assignee_id?: string;

  @IsOptional()
  @IsUUID()
  assigned_mcp_token_id?: string;

  @IsOptional()
  @IsString()
  custom_status_id?: string;
}
