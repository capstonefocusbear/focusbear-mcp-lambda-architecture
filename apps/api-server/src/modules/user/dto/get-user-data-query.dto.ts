import { IsEnum, IsNotEmpty } from 'class-validator';
import { LanguageOptions } from '../../../shared/domain/language-options.enum';

export class GetUserDataQuery {
  @IsNotEmpty()
  @IsEnum(LanguageOptions)
  language: LanguageOptions;
}
