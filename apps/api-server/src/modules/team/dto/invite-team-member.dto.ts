import { IsEmail, IsNotEmpty, IsUUID } from 'class-validator';

export class InviteTeamMemberDto {
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsUUID()
  team_id: string;
}
