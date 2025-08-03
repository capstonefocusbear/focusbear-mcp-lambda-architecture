import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional } from 'class-validator';
import { LanguageOptions } from '../../../shared/domain/language-options.enum';

export class ResetPasswordDto {
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({ enum: LanguageOptions })
  @IsOptional()
  @IsEnum(LanguageOptions)
  lang?: LanguageOptions = LanguageOptions.ENGLISH;
}
