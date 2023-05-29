import { IsEnum, IsNotEmpty } from 'class-validator';
import { LanguageOptions } from '../domain/language-options.enum';

export class GetUserDataQuery {
  @IsNotEmpty()
  @IsEnum(LanguageOptions)
  language: LanguageOptions;
}
