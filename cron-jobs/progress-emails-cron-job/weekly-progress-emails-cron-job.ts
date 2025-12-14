/* eslint-disable no-console */
import { NestFactory } from '@nestjs/core';
import { getQueueToken } from '@nestjs/bull';
import { Queue } from 'bull';
import { AppModule } from '../../apps/api-server/src/app.module';
import { UserRepository } from '../../apps/api-server/src/modules/user/repositories/user.repository';
import { UserProgressMetricsService } from '../../apps/api-server/src/modules/user/services/user-progress-metrics/user-progress-metrics.service';
import { UserEmailPreferencesService } from '../../apps/api-server/src/modules/user/services/user-email-preferences/user-email-preferences.service';
import { Auth0ManagementService } from '@app/auth0';
import { CRON_JOB_TIMEOUT_MS, ONE_MINUTE } from '../../apps/api-server/src/shared/utils/constants';
import { runCronWithTelemetry, captureErrorWithContext } from '../sentry';
import { withTimeout } from '../../apps/api-server/src/shared/utils/helpers';

const BATCH_SIZE = 30; // Process users in batches to avoid overwhelming the queue

const WEEKLY_PROGRESS_EMAILS_CRON_TIMEOUT_MS = (() => {
  const ms = Number(process.env.WEEKLY_PROGRESS_EMAILS_CRON_TIMEOUT_MS);
  if (Number.isFinite(ms) && ms > 0) {
    return ms;
  }
  return Math.max(CRON_JOB_TIMEOUT_MS, 30 * ONE_MINUTE);
})();

async function runWeeklyProgressEmailsCronJob() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const userRepository = app.get(UserRepository);
  const userProgressMetricsService = app.get(UserProgressMetricsService);
  const userEmailPreferencesService = app.get(UserEmailPreferencesService);
  const auth0ManagementService = app.get(Auth0ManagementService);
  const emailQueue: Queue = app.get(getQueueToken('emailQueue'));

  let emailsQueued = 0;
  let usersConsidered = 0;
  let failedEmails = 0;
  try {
    console.log('Starting weekly progress emails cron job...');
    const startedAt = Date.now();

    // Process users in batches to avoid overwhelming the system
    let skip = 0;
    let batchNum = 1;
    while (true) {
      const batch = await userRepository.getUsersForWeeklyEmailsBatch(skip, BATCH_SIZE, 30);
      if (batch.length === 0) break;
      usersConsidered += batch.length;
      const batchStartedAt = Date.now();
      console.log(`Processing batch ${batchNum} (${batch.length} users)`);

      const emailPromises = batch.map(async (user) => {
        try {
          // Fetch email from Auth0
          const { email } = await auth0ManagementService.getAuth0User(user.auth0_id);
          const userWithEmail = { ...user, email };

          // Calculate weekly progress metrics for the user
          const metrics = await userProgressMetricsService.calculateWeeklyProgress(user);

          // Get unsubscribe token
          const { unsubscribe_token } = await userEmailPreferencesService.getEmailPreferences(user.id);

          // Queue the progress email job
          await emailQueue.add(
            'send-progress-email',
            {
              user: userWithEmail,
              metrics,
              unsubscribe_token,
            },
            {
              attempts: 3,
              backoff: {
                type: 'exponential',
                delay: 2000,
              },
              removeOnComplete: true,
              removeOnFail: false,
            },
          );

          return { success: true, userId: user.id };
        } catch (error) {
          captureErrorWithContext(
            error,
            {
              operation: 'queueWeeklyProgressEmail',
              userId: user.id,
              extra: {
                batchIndex: batchNum - 1,
              },
            },
            {
              logLevel: 'error',
            },
          );
          return { success: false, userId: user.id, error: error.message || 'Unknown error' };
        }
      });

      // Wait for all emails in this batch to be queued
      const results = await Promise.all(emailPromises);
      const successful = results.filter((result) => result.success).length;
      const failed = results.length - successful;
      emailsQueued += successful;
      failedEmails += failed;
      console.log(
        `Batch ${batchNum} completed: ${successful} queued, ${failed} failed (${Date.now() - batchStartedAt}ms). Totals: ${emailsQueued} queued, ${failedEmails} failed, ${usersConsidered} users considered (${Date.now() - startedAt}ms)`,
      );

      // Small delay between batches to avoid overwhelming the system
      if (batch.length === BATCH_SIZE) {
        console.log('Waiting 1 second before processing next batch...');
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      skip += BATCH_SIZE;
      batchNum++;
    }

    console.log('Weekly progress emails cron job completed successfully.');
    return {
      emailsQueued,
      usersConsidered,
      failedEmails,
    };
  } catch (error) {
    captureErrorWithContext(
      error,
      {
        operation: 'runWeeklyProgressEmailsCronJob',
      },
      {
        logLevel: 'error',
      },
    );
    throw error;
  } finally {
    await app.close();
  }
}

if (require.main === module) {
  runCronWithTelemetry('weekly-progress-emails-cron', () =>
    withTimeout(runWeeklyProgressEmailsCronJob(), WEEKLY_PROGRESS_EMAILS_CRON_TIMEOUT_MS),
  );
}
