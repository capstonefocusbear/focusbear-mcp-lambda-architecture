import { CronJobDataSource } from '../data-source';
import { UnlockRequest } from '../../apps/api-server/src/modules/accountability-buddy/entities/unlock-request.entity';
import { UnlockRequestStatus } from '../../apps/api-server/src/modules/accountability-buddy/domain/unlock-request-status.enum';
import { runCronWithTelemetry, captureErrorWithContext } from '../sentry';
import { withTimeout } from '../../apps/api-server/src/shared/utils/helpers';
import { CRON_JOB_TIMEOUT_MS } from '../../apps/api-server/src/shared/utils/constants';
// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config();

async function getExpiredPendingUnlockRequests() {
  const expiredRequests = await CronJobDataSource.manager
    .createQueryBuilder(UnlockRequest, 'unlock_request')
    .where('unlock_request.status = :status', { status: UnlockRequestStatus.PENDING })
    .andWhere('unlock_request.unlock_duration_minutes IS NOT NULL')
    .andWhere("unlock_request.created_at + unlock_request.unlock_duration_minutes * INTERVAL '1 minute' < NOW()")
    .getMany();

  return expiredRequests;
}

async function markUnlockRequestAsExpired(unlockRequest: UnlockRequest) {
  try {
    await CronJobDataSource.manager.update(UnlockRequest, unlockRequest.id, {
      status: UnlockRequestStatus.EXPIRED,
      updated_at: new Date().toISOString(),
    });
  } catch (error) {
    captureErrorWithContext(error, {
      operation: 'markUnlockRequestAsExpired',
      cronJob: 'expired-unlock-requests',
      extra: { unlockRequestId: unlockRequest.id },
    });
    throw error;
  }
}

async function runExpiredUnlockRequestsCronJob() {
  if (!CronJobDataSource.isInitialized) {
    await CronJobDataSource.initialize();
  }

  const expiredRequests = await getExpiredPendingUnlockRequests();

  for await (const request of expiredRequests) {
    await markUnlockRequestAsExpired(request);
  }

  return { expiredRequests: expiredRequests.length };
}

if (require.main === module) {
  runCronWithTelemetry('expired-unlock-requests-cron', () =>
    withTimeout(runExpiredUnlockRequestsCronJob(), CRON_JOB_TIMEOUT_MS),
  );
}
