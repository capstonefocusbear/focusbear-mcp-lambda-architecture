import { ProjectResponseDto } from './project-response.dto';

export class ProjectListResponseDto {
  projects: ProjectResponseDto[];

  total_count: number;
}
