import { AccountabilityBuddy } from '../entities/accountability-buddy.entity';
import { ACCOUNTABILITY_BUDDY } from '../../../shared/utils/constants';
import { UnlockRequest } from '../entities/unlock-request.entity';

export function isInvitationExpired(accountabilityBuddy: AccountabilityBuddy): boolean {
  if (!accountabilityBuddy.invitation_sent_at) {
    return false;
  }

  const invitationSentAt = new Date(accountabilityBuddy.invitation_sent_at);
  const expirationTime = new Date(
    invitationSentAt.getTime() + ACCOUNTABILITY_BUDDY.INVITATION_EXPIRATION_DAYS * 24 * 60 * 60 * 1000,
  );
  const now = new Date();

  return now > expirationTime;
}

export function isUnlockRequestExpired(unlockRequest: UnlockRequest): boolean {
  if (!unlockRequest.created_at || !unlockRequest.unlock_duration_minutes) {
    return false;
  }

  const createdAt = new Date(unlockRequest.created_at);
  const expirationTime = new Date(createdAt.getTime() + unlockRequest.unlock_duration_minutes * 60 * 1000);
  const now = new Date();

  return now > expirationTime;
}
