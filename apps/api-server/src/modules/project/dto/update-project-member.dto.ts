import { IsEnum } from 'class-validator';
import { ProjectMemberRole } from '../domain/project-member-role.enum';

export class UpdateProjectMemberDto {
  @IsEnum(ProjectMemberRole)
  role: ProjectMemberRole;
}
