import { IsNotEmpty, IsUUID, IsOptional, IsInt, Min, IsDateString } from 'class-validator';

export class CreateJoinCodeDto {
  @IsNotEmpty()
  @IsUUID('4')
  team_id: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  max_redemptions?: number; // null/undefined = unlimited, 1 = single-use, or any positive integer

  @IsOptional()
  @IsDateString()
  expires_at?: string;
}
