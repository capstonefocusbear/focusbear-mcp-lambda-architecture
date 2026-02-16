import { IsNotEmpty, IsUUID, IsOptional, IsInt, Min, Max, IsDateString } from 'class-validator';

export class CreateBatchJoinCodesDto {
  @IsNotEmpty()
  @IsUUID('4')
  team_id: string;

  @IsNotEmpty()
  @IsInt()
  @Min(1)
  @Max(100)
  count: number; // number of single-use codes to generate

  @IsOptional()
  @IsDateString()
  expires_at?: string;
}
