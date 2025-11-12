import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateUnlockRequestDto {
  @IsNotEmpty()
  @IsUUID()
  accountability_buddy_user_id: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Reason must not exceed 1000 characters' })
  reason?: string;
}
