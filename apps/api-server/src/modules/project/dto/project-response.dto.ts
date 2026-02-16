import { ProjectMemberResponseDto } from './project-member-response.dto';
import { ProjectStatus } from '../domain/project-status.model';

export class ProjectResponseDto {
  id: string;

  name: string;

  description?: string;

  owner_id: string;

  custom_statuses: ProjectStatus[];

  members?: ProjectMemberResponseDto[];

  task_count?: number;

  created_at: string;

  updated_at: string;
}
