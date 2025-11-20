import { IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
import { ACCOUNTABILITY_BUDDY } from '../../../shared/utils/constants';

export class CreateUnlockRequestDto {
  @IsNotEmpty()
  @IsUUID()
  accountability_buddy_user_id: string;

  @IsOptional()
  @IsString()
  @MaxLength(ACCOUNTABILITY_BUDDY.UNLOCK_REQUEST_REASON_MAX_LENGTH, {
    message: `Reason must not exceed ${ACCOUNTABILITY_BUDDY.UNLOCK_REQUEST_REASON_MAX_LENGTH} characters`,
  })
  reason?: string;

  @IsOptional()
  @IsNumber()
  @Min(ACCOUNTABILITY_BUDDY.UNLOCK_DURATION_MIN_MINUTES, {
    message: `Unlock duration must be at least ${ACCOUNTABILITY_BUDDY.UNLOCK_DURATION_MIN_MINUTES} minute`,
  })
  @Max(ACCOUNTABILITY_BUDDY.UNLOCK_DURATION_MAX_MINUTES, {
    message: `Unlock duration must not exceed ${ACCOUNTABILITY_BUDDY.UNLOCK_DURATION_MAX_MINUTES} minutes (24 hours)`,
  })
  unlock_duration_minutes?: number;
}
