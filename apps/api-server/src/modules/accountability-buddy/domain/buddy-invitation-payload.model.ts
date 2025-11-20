export class BuddyInvitationPayload {
  constructor(invitePayload: BuddyInvitationPayload) {
    Object.assign(this, { ...invitePayload });
  }

  user_id: string;

  buddy_email: string;

  accountability_buddy_id: string;
}
