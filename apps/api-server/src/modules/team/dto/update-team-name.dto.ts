import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class UpdateTeamNameDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsUUID()
  team_id: string;
}
