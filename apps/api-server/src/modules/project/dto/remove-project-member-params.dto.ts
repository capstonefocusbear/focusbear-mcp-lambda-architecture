import { IsUUID } from 'class-validator';

export class RemoveProjectMemberParamsDto {
  @IsUUID()
  project_id: string;

  @IsUUID()
  member_id: string;
}
