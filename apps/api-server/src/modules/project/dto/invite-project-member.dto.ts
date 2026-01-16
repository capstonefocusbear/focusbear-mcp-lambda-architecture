import { IsEmail, IsEnum, IsNotEmpty, IsOptional } from 'class-validator';
import { ProjectMemberRole } from '../domain/project-member-role.enum';

export class InviteProjectMemberDto {
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsOptional()
  @IsEnum(ProjectMemberRole)
  role?: ProjectMemberRole;
}
