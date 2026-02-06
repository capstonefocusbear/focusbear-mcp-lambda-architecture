import { IsEmail, IsIn, IsNotEmpty, IsOptional } from 'class-validator';
import { ProjectMemberRole } from '../domain/project-member-role.enum';

export class InviteProjectMemberDto {
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsOptional()
  @IsIn([ProjectMemberRole.ADMIN, ProjectMemberRole.MEMBER], {
    message: 'Role must be admin or member',
  })
  role?: ProjectMemberRole;
}
