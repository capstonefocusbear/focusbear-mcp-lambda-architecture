export class MemberInvitationPayload {
  constructor({ email, owner_id }: MemberInvitationPayload) {
    Object.assign(this, { email, owner_id });
  }

  email: string;

  owner_id: string;
}
