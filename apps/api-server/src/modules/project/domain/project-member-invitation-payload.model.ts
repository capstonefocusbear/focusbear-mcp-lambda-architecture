export class ProjectMemberInvitationPayload {
  constructor(invitePayload: ProjectMemberInvitationPayload) {
    Object.assign(this, { ...invitePayload });
  }

  email: string;

  admin_id: string;

  project_id: string;

  project_name: string;

  role: string;
}
