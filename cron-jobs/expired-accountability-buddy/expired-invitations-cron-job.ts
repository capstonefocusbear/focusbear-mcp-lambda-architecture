import { CronJobDataSource } from '../data-source';
import { AccountabilityBuddy } from '../../apps/api-server/src/modules/accountability-buddy/entities/accountability-buddy.entity';
import { InvitationStatus } from '../../apps/api-server/src/modules/accountability-buddy/domain/invitation-status.enum';
import { runCronWithTelemetry, captureErrorWithContext } from '../sentry';
import { withTimeout } from '../../apps/api-server/src/shared/utils/helpers';
import { CRON_JOB_TIMEOUT_MS, ACCOUNTABILITY_BUDDY } from '../../apps/api-server/src/shared/utils/constants';
// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config();

async function getExpiredPendingInvitations() {
  const expiredInvitations = await CronJobDataSource.manager
    .createQueryBuilder(AccountabilityBuddy, 'accountability_buddy')
    .where('accountability_buddy.invitation_status = :status', { status: InvitationStatus.PENDING })
    .andWhere('accountability_buddy.invitation_sent_at IS NOT NULL')
    .andWhere(
      `accountability_buddy.invitation_sent_at + INTERVAL '${ACCOUNTABILITY_BUDDY.INVITATION_EXPIRATION_DAYS} day' < NOW()`,
    )
    .getMany();

  return expiredInvitations;
}

async function markInvitationAsExpired(invitation: AccountabilityBuddy) {
  try {
    await CronJobDataSource.manager.update(AccountabilityBuddy, invitation.id, {
      invitation_status: InvitationStatus.EXPIRED,
      updated_at: new Date().toISOString(),
    });
  } catch (error) {
    captureErrorWithContext(error, {
      operation: 'markInvitationAsExpired',
      cronJob: 'expired-invitations',
      extra: { invitationId: invitation.id },
    });
    throw error;
  }
}

async function runExpiredInvitationsCronJob() {
  if (!CronJobDataSource.isInitialized) {
    await CronJobDataSource.initialize();
  }

  const expiredInvitations = await getExpiredPendingInvitations();

  for await (const invitation of expiredInvitations) {
    await markInvitationAsExpired(invitation);
  }

  return { expiredInvitations: expiredInvitations.length };
}

if (require.main === module) {
  runCronWithTelemetry('expired-invitations-cron', () =>
    withTimeout(runExpiredInvitationsCronJob(), CRON_JOB_TIMEOUT_MS),
  );
}
