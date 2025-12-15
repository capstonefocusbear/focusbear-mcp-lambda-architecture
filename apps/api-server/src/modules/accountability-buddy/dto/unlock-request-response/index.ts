import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UnlockRequestStatus } from '../../domain/unlock-request-status.enum';
import { RequesterInfoDto } from './requester-info.dto';

export class UnlockRequestResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  created_at: string;

  @ApiProperty()
  updated_at: string;

  @ApiPropertyOptional({ nullable: true })
  reason: string | null;

  @ApiProperty({ enum: UnlockRequestStatus })
  status: UnlockRequestStatus;

  @ApiPropertyOptional({ nullable: true })
  approved_at: string | null;

  @ApiPropertyOptional({ nullable: true })
  unlock_duration_minutes: number | null;

  @ApiProperty({ type: RequesterInfoDto })
  requester_info: RequesterInfoDto;
}
