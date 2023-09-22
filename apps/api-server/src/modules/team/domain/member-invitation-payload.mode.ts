export class MemberInvitationPayload {
  constructor({ email, admin_id, team_id }: MemberInvitationPayload) {
    Object.assign(this, { email, admin_id, team_id });
  }

  email: string;

  admin_id: string;

  team_id: string;
}
