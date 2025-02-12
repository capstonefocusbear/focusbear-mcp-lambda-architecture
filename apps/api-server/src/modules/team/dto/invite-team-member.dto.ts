import { Type } from 'class-transformer';
import { IsBoolean, IsDate, IsEmail, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class InviteTeamMemberDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsNotEmpty()
  @IsUUID()
  team_id: string;

  @IsOptional()
  @IsString()
  first_name?: string;

  @IsOptional()
  @IsString()
  last_name?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  member_expiry_date?: Date;

  @IsNotEmpty()
  @IsBoolean()
  is_admin: boolean;

  @IsNotEmpty()
  @IsBoolean()
  is_member: boolean;

  @IsOptional()
  @IsUUID('4')
  user_id?: string;
}
