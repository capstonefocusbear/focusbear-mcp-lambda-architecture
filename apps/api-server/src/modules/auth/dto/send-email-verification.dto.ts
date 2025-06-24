import { LanguageOptions } from '@api-server/modules/user/domain/language-options.enum';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SendEmailVerificationDto {
  @IsString()
  @IsOptional()
  auth0_id?: string;

  @IsString()
  @IsOptional()
  user_id?: string;

  @IsString()
  @IsNotEmpty()
  html: string;

  @ApiProperty({ enum: LanguageOptions })
  @IsOptional()
  @IsEnum(LanguageOptions)
  lang?: LanguageOptions = LanguageOptions.ENGLISH;
}
