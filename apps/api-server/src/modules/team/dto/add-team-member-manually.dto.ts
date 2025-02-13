import { Type } from 'class-transformer';
import { IsDate, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class AddTeamManuallyDto {
  @IsNotEmpty()
  @IsUUID('4')
  user_id: string;

  @IsNotEmpty()
  @IsUUID('4')
  team_id: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  member_expiry_date?: Date;
}
