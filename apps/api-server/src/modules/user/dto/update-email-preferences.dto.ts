import { IsOptional, IsEnum, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { EmailFrequency } from '../entities/user.entity';
import { EmailPreferences } from './email-preferences.dto';

export class UpdateEmailPreferencesDto {
  @ApiProperty({
    enum: EmailFrequency,
    description: 'Email frequency preference',
    required: false,
  })
  @IsOptional()
  @IsEnum(EmailFrequency)
  email_frequency?: EmailFrequency;

  @ApiProperty({
    description: 'Email preferences object',
    required: false,
  })
  @IsOptional()
  @IsObject()
  preferences?: EmailPreferences;
}
