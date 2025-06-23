import { IsNotEmpty, IsUUID } from 'class-validator';

export class AddTeamManuallyDto {
  @IsNotEmpty()
  @IsUUID('4')
  user_id: string;

  @IsNotEmpty()
  @IsUUID('4')
  team_id: string;
}
