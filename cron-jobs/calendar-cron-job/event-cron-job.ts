/* eslint-disable linebreak-style */
import { Queue } from 'bullmq';
import { BullQueues, BullWorkers, CRON_JOB_TIMEOUT_MS } from '../../apps/api-server/src/shared/utils/constants';
import { CronJobDataSource } from '../data-source';
import { PlatformIntegration } from '../../apps/api-server/src/modules/platform-integrations/entities/platform-integration.entity';
import { CalendarPlatforms } from '../../apps/api-server/src/modules/platform-integrations/domain/calendar-platforms.enum';
import { runCronWithTelemetry } from '../sentry';
import { withTimeout } from '../../apps/api-server/src/shared/utils/helpers';

/* eslint-disable @typescript-eslint/no-var-requires */

require('dotenv').config();

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
  const syncQueue = new Queue(BullQueues.SYNC_EVENTS, {
    connection: { host: process.env.REDIS_HOSTNAME, port: Number(process.env.REDIS_PORT) },
  });

  try {
    let jobsEnqueued = 0;

    const enqueueSyncJobs = async (
      platform: CalendarPlatforms,
      users: {
        id: string;
        account: string;
      }[],
    ) => {
      for await (const user of users) {
        await syncQueue.add(BullWorkers.SYNC_EVENTS_FOR_PLATFORM, {
          platform,
          userId: user.id,
          account: user.account,
        });
        jobsEnqueued += 1;
      }
    };

    const usersToSyncGoogle = await getUsersToSyncWithPlatform(CalendarPlatforms.GOOGLE);
    await enqueueSyncJobs(CalendarPlatforms.GOOGLE, usersToSyncGoogle);

    const usersToSyncMicrosoft = await getUsersToSyncWithPlatform(CalendarPlatforms.MICROSOFT);
    await enqueueSyncJobs(CalendarPlatforms.MICROSOFT, usersToSyncMicrosoft);

    return { jobsEnqueued };
  } finally {
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
  }
}

if (require.main === module) {
  runCronWithTelemetry('calendar-event-cron', () => withTimeout(runEventCronJob(), CRON_JOB_TIMEOUT_MS));
}
