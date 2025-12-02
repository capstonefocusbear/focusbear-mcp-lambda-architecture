import { MAX_WORD_LENGTH } from '@app/openai/openai.constants';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

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
  @Transform(({ value, obj }) => value ?? obj?.justification ?? undefined)
  @MaxLength(MAX_WORD_LENGTH.justification)
  justificationForThisSpecificApp?: string;

  @IsOptional()
  @IsString()
  language = 'English';

  @IsOptional()
  @IsString()
  currentTaskInToDoPlayer?: string;
}
