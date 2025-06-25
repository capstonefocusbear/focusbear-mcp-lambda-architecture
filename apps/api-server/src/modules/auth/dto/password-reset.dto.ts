import { LanguageOptions } from '@api-server/modules/user/domain/language-options.enum';
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional } from 'class-validator';

export class ResetPasswordDto {
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({ enum: LanguageOptions })
  @IsOptional()
  @IsEnum(LanguageOptions)
  lang?: LanguageOptions = LanguageOptions.ENGLISH;
}
