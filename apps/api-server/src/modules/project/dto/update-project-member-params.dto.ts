import { IsUUID } from 'class-validator';

export class UpdateProjectMemberParamsDto {
  @IsUUID()
  project_id: string;

  @IsUUID()
  member_id: string;
}
