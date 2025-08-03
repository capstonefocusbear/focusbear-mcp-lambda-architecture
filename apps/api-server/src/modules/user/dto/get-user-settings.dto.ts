import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { LanguageOptions } from '../../../shared/domain/language-options.enum';

export class GetUserSettingsDto {
  @IsNotEmpty()
  @IsUUID()
  user_id: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsEnum(LanguageOptions)
  @ApiProperty({ enum: LanguageOptions })
  language?: LanguageOptions;
}
