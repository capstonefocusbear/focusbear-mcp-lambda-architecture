import { ApiProperty } from '@nestjs/swagger';
import { EmailFrequency } from '../entities/user.entity';

export class EmailPreferencesResponseDto {
  @ApiProperty({ enum: EmailFrequency, description: 'Current email frequency setting' })
  email_frequency: EmailFrequency;

  @ApiProperty({ description: 'Timestamp of last email sent', nullable: true })
  last_email_sent: string | null;

  @ApiProperty({ description: 'Token for one-click unsubscribe' })
  unsubscribe_token: string;
}
