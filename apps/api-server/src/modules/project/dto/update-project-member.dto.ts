import { IsIn } from 'class-validator';
import { ProjectMemberRole } from '../domain/project-member-role.enum';

export class UpdateProjectMemberDto {
  @IsIn([ProjectMemberRole.ADMIN, ProjectMemberRole.MEMBER], {
    message: 'Role must be admin or member',
  })
  role: ProjectMemberRole;
}
