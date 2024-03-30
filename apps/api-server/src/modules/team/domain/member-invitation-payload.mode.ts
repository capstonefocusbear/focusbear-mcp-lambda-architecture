export class MemberInvitationPayload {
  constructor(invitePayload: MemberInvitationPayload) {
    Object.assign(this, { ...invitePayload });
  }

  email: string;

  admin_id: string;

  team_id: string;

  first_name?: string;

  last_name?: string;

  member_expiry_date?: Date;

  is_admin: boolean;

  is_member: boolean;

  team_name: string;
}
