import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { EmailFrequency } from '../entities/user.entity';

export class UpdateEmailPreferencesWithTokenDto {
  @ApiProperty({
    description: 'The email preferences token sent to the user via email.',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({
    description: 'The desired new email frequency.',
    enum: EmailFrequency,
    example: EmailFrequency.DAILY,
  })
  @IsEnum(EmailFrequency)
  @IsNotEmpty()
  email_frequency: EmailFrequency;
}
