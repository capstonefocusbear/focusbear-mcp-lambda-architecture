import { IsNotEmpty, IsUUID } from 'class-validator';

export class AddTeamMemberDto {
  @IsNotEmpty()
  @IsUUID()
  member_id: string;

  @IsNotEmpty()
  @IsUUID()
  team_id: string;
}
