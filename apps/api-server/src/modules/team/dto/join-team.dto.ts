import { IsNotEmpty, IsString } from 'class-validator';

export class JoinTeamDto {
  @IsNotEmpty()
  @IsString()
  join_code: string;
}
