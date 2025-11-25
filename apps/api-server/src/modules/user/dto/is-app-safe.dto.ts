import { MAX_WORD_LENGTH } from '@app/openai/openai.constants';
import { IsOptional, IsString, MaxLength } from 'class-validator';

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

  @IsOptional()
  @IsString()
  language = 'English';

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
