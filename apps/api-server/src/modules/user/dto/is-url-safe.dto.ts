import { MAX_WORD_LENGTH } from '@app/openai/openai.constants';
import { IsOptional, IsString, MaxLength, IsArray } from 'class-validator';

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

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(MAX_WORD_LENGTH.justification, { each: true })
  lastFiveJustificationsInThisFocusSession?: string[];

  @IsOptional()
  @IsString()
  currentTaskInToDoPlayer?: string;

  @IsOptional()
  @IsString()
  user_job_details?: string;

  @IsOptional()
  @IsString()
  user_typical_distractions?: string;
}
