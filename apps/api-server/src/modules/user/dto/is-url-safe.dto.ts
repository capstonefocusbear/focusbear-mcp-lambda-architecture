import { MAX_WORD_LENGTH } from '@app/openai/openai.constants';
import { IsOptional, IsString, MaxLength, IsArray, IsEnum } from 'class-validator';
import { UrlSafePromptType } from '@app/openai/domain/url-safe-prompt-type.enum';

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
  @IsEnum(UrlSafePromptType)
  promptType?: UrlSafePromptType = UrlSafePromptType.DEFAULT;
}
