import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { LanguageOptions } from '../../../shared/domain/language-options.enum';

export class GetUserSettingsQueryDto {
  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsEnum(LanguageOptions)
  @ApiProperty({ enum: LanguageOptions })
  language?: LanguageOptions;
}
