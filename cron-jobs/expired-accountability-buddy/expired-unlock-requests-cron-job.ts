import { CronJobDataSource } from '../data-source';
import { UnlockRequest } from '../../apps/api-server/src/modules/accountability-buddy/entities/unlock-request.entity';
import { UnlockRequestStatus } from '../../apps/api-server/src/modules/accountability-buddy/domain/unlock-request-status.enum';
import { runCronWithTelemetry, captureErrorWithContext } from '../sentry';
import { withTimeout } from '../../apps/api-server/src/shared/utils/helpers';
import { CRON_JOB_TIMEOUT_MS } from '../../apps/api-server/src/shared/utils/constants';
// biome-ignore lint/style/noCommonJs: cron script uses require for dotenv
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

  try {
    const expiredRequests = await getExpiredPendingUnlockRequests();

    for await (const request of expiredRequests) {
      await markUnlockRequestAsExpired(request);
    }

    return { expiredRequests: expiredRequests.length };
  } finally {
    if (CronJobDataSource.isInitialized) {
      await CronJobDataSource.destroy().catch((error) => {
        console.error('Failed to destroy CronJobDataSource', error);
      });
    }
  }
}

if (require.main === module) {
  runCronWithTelemetry('expired-unlock-requests-cron', () =>
    withTimeout(runExpiredUnlockRequestsCronJob(), CRON_JOB_TIMEOUT_MS),
  );
}
