import { LanguageOptions } from '@api-server/modules/user/domain/language-options.enum';
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';

export class SendEmailVerificationDto {
  @IsString()
  @IsEmail()
  email: string;

  @ApiProperty({ enum: LanguageOptions })
  @IsOptional()
  @IsEnum(LanguageOptions)
  lang?: LanguageOptions = LanguageOptions.ENGLISH;
}
