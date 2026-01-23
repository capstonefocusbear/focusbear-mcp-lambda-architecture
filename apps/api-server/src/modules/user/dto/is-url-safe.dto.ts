import { MAX_WORD_LENGTH } from '@app/openai/openai.constants';
import { IsOptional, IsString, MaxLength, IsArray, IsBoolean, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CurrentTaskDto } from './current-task.dto';

export class IsUrlSafeDto {
  @IsOptional()
  @IsString()
  url: string;

  @IsOptional()
  @IsString()
  tab_title: string;

  @IsOptional()
  @IsString()
  meta_description: string;

  @IsOptional()
  @IsString()
  focus_mode: string;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_WORD_LENGTH.intention)
  intention: string;

  @IsOptional()
  @IsString()
  language = 'English';

  @IsOptional()
  @IsString()
  @MaxLength(MAX_WORD_LENGTH.justification)
  justificationForThisUrl?: string;

  // Legacy/alias fields used by some clients
  @IsOptional()
  @IsString()
  @MaxLength(MAX_WORD_LENGTH.justification)
  justification?: string;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_WORD_LENGTH.justification)
  extraJustificationForThisSite?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(MAX_WORD_LENGTH.justification, { each: true })
  lastFiveJustificationsInThisFocusSession?: string[];

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
