import { IsUUID } from 'class-validator';

export class UpdateProjectParamsDto {
  @IsUUID()
  project_id: string;
}
