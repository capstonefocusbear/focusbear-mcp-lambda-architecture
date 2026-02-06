import { ProjectMemberRole } from '../domain/project-member-role.enum';
import { ProjectMemberInvitationStatus } from '../domain/project-member-invitation-status.enum';

export class ProjectMemberResponseDto {
  id: string;

  user_id?: string;

  email?: string;

  role: ProjectMemberRole;

  invitation_status: ProjectMemberInvitationStatus;

  invitation_sent_at?: Date;

  invitation_responded_at?: Date;

  created_at: string;

  updated_at: string;
}
