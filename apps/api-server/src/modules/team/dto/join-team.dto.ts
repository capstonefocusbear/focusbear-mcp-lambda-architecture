import { IsNotEmpty, IsUUID } from 'class-validator';

export class JoinTeamDto {
  @IsNotEmpty()
  @IsUUID('4')
  team_id: string;
}
