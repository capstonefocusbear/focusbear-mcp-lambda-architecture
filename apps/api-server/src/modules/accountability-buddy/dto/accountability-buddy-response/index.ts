import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InvitationStatus } from '../../domain/invitation-status.enum';
import { BuddyInfoDto } from './buddy-info.dto';
import { InviterInfoDto } from './inviter-info.dto';

export class AccountabilityBuddyResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  created_at: string;

  @ApiProperty()
  updated_at: string;

  @ApiProperty({ enum: InvitationStatus })
  invitation_status: InvitationStatus;

  @ApiPropertyOptional()
  invitation_sent_at?: string;

  @ApiPropertyOptional({ nullable: true })
  invitation_responded_at?: string | null;

  @ApiProperty({ type: BuddyInfoDto })
  buddy_info: BuddyInfoDto;

  @ApiProperty({ type: InviterInfoDto })
  inviter_info: InviterInfoDto;
}
