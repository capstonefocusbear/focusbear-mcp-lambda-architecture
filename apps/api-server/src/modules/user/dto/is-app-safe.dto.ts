import { MAX_WORD_LENGTH } from '@app/openai/openai.constants';
import { IsOptional, IsString, MaxLength, IsBoolean, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CurrentTaskDto } from './current-task.dto';

export class IsAppSafeDto {
  @IsOptional()
  @IsString()
  focusMode: string;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_WORD_LENGTH.intention)
  intention: string;

  @IsOptional()
  @IsString()
  appName: string;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_WORD_LENGTH.justification)
  justificationForThisSpecificApp?: string;

  // Legacy/alias field used by some clients
  @IsOptional()
  @IsString()
  @MaxLength(MAX_WORD_LENGTH.justification)
  justification?: string;

  @IsOptional()
  @IsString()
  language = 'English';

  @IsOptional()
  @IsString()
  currentTaskInToDoPlayer?: string;

  @IsOptional()
  @IsBoolean()
  task_must_align_to_focus_intention?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CurrentTaskDto)
  current_tasks?: CurrentTaskDto[];
}
