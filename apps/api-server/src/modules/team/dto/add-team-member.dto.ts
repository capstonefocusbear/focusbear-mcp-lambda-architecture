import { IsEmail, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class AddTeamMemberDto {
  @IsOptional()
  @IsUUID()
  member_id?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsNotEmpty()
  @IsUUID()
  team_id: string;
}
