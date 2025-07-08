import { IsEmail, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class RemoveTeamMemberDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsUUID()
  member_id?: string;

  @IsNotEmpty()
  @IsUUID()
  team_id: string;
}
