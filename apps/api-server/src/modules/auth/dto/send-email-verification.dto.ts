import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { LanguageOptions } from '../../../shared/domain/language-options.enum';

export class SendEmailVerificationDto {
  @IsString()
  @IsEmail()
  email: string;

  @ApiProperty({ enum: LanguageOptions })
  @IsOptional()
  @IsEnum(LanguageOptions)
  lang?: LanguageOptions = LanguageOptions.ENGLISH;
}
