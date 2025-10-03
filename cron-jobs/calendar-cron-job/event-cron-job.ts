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
    return integration.data.access_token; // && integration.data.refresh_token;
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
  // Initialize the BullMQ queue
  const syncQueue = new Queue(BullQueues.SYNC_EVENTS, {
    connection: { host: process.env.REDIS_HOSTNAME, port: Number(process.env.REDIS_PORT) },
  });
  let jobsEnqueued = 0;

  // Function to enqueue jobs
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

  // Enqueue jobs for Google Calendar
  const usersToSyncGoogle = await getUsersToSyncWithPlatform(CalendarPlatforms.GOOGLE);
  await enqueueSyncJobs(CalendarPlatforms.GOOGLE, usersToSyncGoogle);

  // Enqueue jobs for Microsoft Calendar
  const usersToSyncMicrosoft = await getUsersToSyncWithPlatform(CalendarPlatforms.MICROSOFT);
  await enqueueSyncJobs(CalendarPlatforms.MICROSOFT, usersToSyncMicrosoft);

  await syncQueue.close();

  return { jobsEnqueued };
}

if (require.main === module) {
  runCronWithTelemetry('calendar-event-cron', () => withTimeout(runEventCronJob(), CRON_JOB_TIMEOUT_MS));
}
