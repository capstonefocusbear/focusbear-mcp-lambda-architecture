import { ApiProperty } from '@nestjs/swagger';
import { InvitationStatus } from '../domain/invitation-status.enum';

export class GetTeamMembersDetailsDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001' })
  id: string;

  @ApiProperty({ example: 'john.doe@example.com' })
  email: string;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  last_active_date: string;

  @ApiProperty({ example: 'John' })
  first_name: string;

  @ApiProperty({ example: 'Doe' })
  last_name: string;

  @ApiProperty({ example: '2024-12-31T23:59:59.999Z' })
  member_expiry_date: Date;

  @ApiProperty({ example: '2024-01-10T09:00:00.000Z' })
  created_at: string;

  @ApiProperty({ example: 5 })
  morning_routines_streak: number;

  @ApiProperty({ example: 3 })
  evening_routines_streak: number;

  @ApiProperty({ example: 12 })
  focus_modes_streak: number;

  @ApiProperty({ example: 85.5 })
  morning_percent_number_day_of_stats_completed: number;

  @ApiProperty({ example: 92.3 })
  micro_percent_number_day_of_stats_completed: number;

  @ApiProperty({ example: 78.9 })
  evening_percent_number_day_of_stats_completed: number;

  @ApiProperty({ example: 67.2 })
  focus_modes_percent_number_day_of_stats_completed: number;

  @ApiProperty({ example: InvitationStatus.PENDING, enum: InvitationStatus })
  invitation_status: InvitationStatus;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  invitation_sent_at: Date;

  @ApiProperty({ example: 2 })
  invitation_send_count: number;

  @ApiProperty({ example: '2024-01-16T14:45:00.000Z' })
  invitation_responded_at: Date;
}
