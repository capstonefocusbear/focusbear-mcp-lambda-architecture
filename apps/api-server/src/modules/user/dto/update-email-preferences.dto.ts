import { IsOptional, IsEnum, IsObject, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { EmailFrequency } from '../entities/user.entity';

export class EmailPreferences {
  @IsOptional()
  @IsBoolean()
  include_shareable_content?: boolean;
}

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
