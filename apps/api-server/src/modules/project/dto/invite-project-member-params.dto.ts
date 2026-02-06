import { IsUUID } from 'class-validator';

export class InviteProjectMemberParamsDto {
  @IsUUID()
  project_id: string;
}
