import { IsUUID } from 'class-validator';

export class AcceptInvitationParamsDto {
  @IsUUID()
  project_id: string;
}
