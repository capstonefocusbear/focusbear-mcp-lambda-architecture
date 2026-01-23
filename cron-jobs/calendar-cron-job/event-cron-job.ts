/* eslint-disable linebreak-style */
import { Queue } from 'bullmq';
import { BullQueues, BullWorkers, CRON_JOB_TIMEOUT_MS } from '../../apps/api-server/src/shared/utils/constants';
import { CronJobDataSource } from '../data-source';
import { PlatformIntegration } from '../../apps/api-server/src/modules/platform-integrations/entities/platform-integration.entity';
import { CalendarPlatforms } from '../../apps/api-server/src/modules/platform-integrations/domain/calendar-platforms.enum';
import { captureErrorWithContext, runCronWithTelemetry } from '../sentry';
import { withTimeout } from '../../apps/api-server/src/shared/utils/helpers';

/* eslint-disable @typescript-eslint/no-var-requires */

require('dotenv').config();

let cleanupCalendarEventCronResources: (() => Promise<void>) | undefined;

async function getUsersToSyncWithPlatform(platform: CalendarPlatforms) {
  const IntegrationRecords = await CronJobDataSource.manager.find(PlatformIntegration, {
    where: { platform },
  });
  const recordsWithAccessAndRefreshTokens = IntegrationRecords.filter((integration) => {
    // Skip accounts that require reauth (e.g., missing scopes, invalid tokens)
    return integration.data?.access_token && !integration.data?.requires_reauth;
  });
  const idsOfUsersToSync = recordsWithAccessAndRefreshTokens.map((integrationRecord) => {
    return {
      id: integrationRecord.user_id,
      account: integrationRecord.external_user_id,
    };
  });
  return idsOfUsersToSync;
}

async function runEventCronJob() {
  await CronJobDataSource.initialize();

  const redisHost = process.env.REDIS_HOSTNAME;
  const redisPortRaw = process.env.REDIS_PORT;
  const redisPort = Number(redisPortRaw);
  if (!redisHost) {
    const error = new Error('REDIS_HOSTNAME environment variable is required but not set');
    captureErrorWithContext(error, { operation: 'env.REDIS_HOSTNAME', cronJob: 'calendar-event' });
    throw error;
  }
  if (!redisPortRaw || !Number.isFinite(redisPort) || redisPort <= 0) {
    const error = new Error(`REDIS_PORT environment variable is required but invalid: "${redisPortRaw ?? ''}"`);
    captureErrorWithContext(error, {
      operation: 'env.REDIS_PORT',
      cronJob: 'calendar-event',
      extra: { redisHost, redisPortRaw },
    });
    throw error;
  }
  const syncQueue = new Queue(BullQueues.SYNC_EVENTS, {
    connection: {
      host: redisHost,
      port: redisPort,
      // Fail fast in cron jobs (do not buffer commands while Redis is down).
      enableOfflineQueue: false,
      // Bound how long a single Redis command can retry.
      maxRetriesPerRequest: 1,
      // Bound initial TCP connect time.
      connectTimeout: 10_000,
    },
  });

  let didCleanup = false;
  const cleanup = async () => {
    if (didCleanup) return;
    didCleanup = true;

    await syncQueue.close().catch((error) => {
      // eslint-disable-next-line no-console
      console.error('Failed to close BullMQ queue', error);
    });
    if (CronJobDataSource.isInitialized) {
      await CronJobDataSource.destroy().catch((error) => {
        // eslint-disable-next-line no-console
        console.error('Failed to destroy CronJobDataSource', error);
      });
    }
  };

  cleanupCalendarEventCronResources = cleanup;

  syncQueue.on('error', (error) => {
    captureErrorWithContext(error, {
      operation: 'syncQueue.error',
      cronJob: 'calendar-event',
      extra: { redisHost, redisPort },
    });
  });

  try {
    let jobsEnqueued = 0;

    try {
      await withTimeout(syncQueue.waitUntilReady(), 10_000, 'Redis connection timed out');
    } catch (error) {
      captureErrorWithContext(error, {
        operation: 'syncQueue.waitUntilReady',
        cronJob: 'calendar-event',
        extra: { redisHost, redisPort },
      });
      throw error;
    }

    const enqueueSyncJobs = async (
      platform: CalendarPlatforms,
      users: {
        id: string;
        account: string;
      }[],
    ) => {
      for await (const user of users) {
        try {
          await syncQueue.add(BullWorkers.SYNC_EVENTS_FOR_PLATFORM, {
            platform,
            userId: user.id,
            account: user.account,
          });
        } catch (error) {
          captureErrorWithContext(error, {
            operation: 'syncQueue.add',
            cronJob: 'calendar-event',
            userId: user.id,
            extra: {
              platform,
              account: user.account,
              jobsEnqueued,
              redisHost,
              redisPort,
            },
          });
          throw error;
        }
        jobsEnqueued += 1;
      }
    };

    const usersToSyncGoogle = await getUsersToSyncWithPlatform(CalendarPlatforms.GOOGLE);
    await enqueueSyncJobs(CalendarPlatforms.GOOGLE, usersToSyncGoogle);

    const usersToSyncMicrosoft = await getUsersToSyncWithPlatform(CalendarPlatforms.MICROSOFT);
    await enqueueSyncJobs(CalendarPlatforms.MICROSOFT, usersToSyncMicrosoft);

    return { jobsEnqueued };
  } finally {
    cleanupCalendarEventCronResources = undefined;
    await cleanup();
  }
}

if (require.main === module) {
  runCronWithTelemetry('calendar-event-cron', () =>
    withTimeout(runEventCronJob(), CRON_JOB_TIMEOUT_MS, 'Operation timed out', async () => {
      await cleanupCalendarEventCronResources?.();
    }),
  );
}
