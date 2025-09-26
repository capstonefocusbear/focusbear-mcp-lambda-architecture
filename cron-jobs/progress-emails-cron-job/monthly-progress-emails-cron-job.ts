/* eslint-disable no-console */
import { NestFactory } from '@nestjs/core';
import { getQueueToken } from '@nestjs/bull';
import { Queue } from 'bull';
import { AppModule } from '../../apps/api-server/src/app.module';
import { UserRepository } from '../../apps/api-server/src/modules/user/repositories/user.repository';
import { UserProgressMetricsService } from '../../apps/api-server/src/modules/user/services/user-progress-metrics/user-progress-metrics.service';
import { UserEmailPreferencesService } from '../../apps/api-server/src/modules/user/services/user-email-preferences/user-email-preferences.service';
import { Auth0ManagementService } from '@app/auth0';
import { CRON_JOB_TIMEOUT_MS } from '../../apps/api-server/src/shared/utils/constants';
import { withSentry, captureErrorWithContext } from '../sentry';
import { withTimeout } from '../../apps/api-server/src/shared/utils/helpers';

const BATCH_SIZE = 15; // Reduced batch size to prevent OOM issues

async function runMonthlyProgressEmailsCronJob() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const userRepository = app.get(UserRepository);
  const userProgressMetricsService = app.get(UserProgressMetricsService);
  const userEmailPreferencesService = app.get(UserEmailPreferencesService);
  const auth0ManagementService = app.get(Auth0ManagementService);
  const emailQueue: Queue = app.get(getQueueToken('emailQueue'));

  try {
    console.log('Starting monthly progress emails cron job...');

    // Log initial memory usage
    const initialMemory = process.memoryUsage();
    console.log(`Initial memory usage: ${Math.round(initialMemory.heapUsed / 1024 / 1024)}MB heap, ${Math.round(initialMemory.rss / 1024 / 1024)}MB RSS`);

    // Paginated batch processing to avoid OOM
    let skip = 0;
    let batchNum = 1;
    while (true) {
      const batch = await userRepository.getUsersForMonthlyEmailsBatch(skip, BATCH_SIZE);
      if (batch.length === 0) break;
      // Log memory usage for this batch
      const batchMemory = process.memoryUsage();
      console.log(
        `Processing batch ${batchNum} (${batch.length} users) - Memory: ${Math.round(batchMemory.heapUsed / 1024 / 1024)}MB heap`
      );

      const emailPromises = batch.map(async (user) => {
        try {
          // Fetch email from Auth0
          const { email } = await auth0ManagementService.getAuth0User(user.auth0_id);
          const userWithEmail = { ...user, email };

          // Calculate monthly progress metrics for the user
          const monthStart = new Date();
          monthStart.setDate(1); // First day of the current month
          const metrics = await userProgressMetricsService.calculateMonthlyProgress(user, monthStart);

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

          console.log(`Queued monthly progress email for user ${user.id}`);
          return { success: true, userId: user.id };
        } catch (error) {
          captureErrorWithContext(
            error,
            {
              operation: 'queueMonthlyProgressEmail',
              userId: user.id,
              extra: {
                batchIndex: batchNum - 1,
              },
            },
            {
              logLevel: 'error',
            },
          );
          console.error(`Failed to process user ${user.id}: ${error.message}`);
          return { success: false, userId: user.id, error: error.message };
        }
      });

      const results = await Promise.all(emailPromises);
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      console.log(`Batch ${batchNum} completed: ${successful} successful, ${failed} failed`);

      // Force garbage collection and connection cleanup between batches
      if (global.gc) {
        global.gc();
      }

      // Delay between batches for memory recovery and rate limiting
      if (batch.length === BATCH_SIZE) {
        console.log('Waiting 3 seconds before processing next batch (memory recovery)...');
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
      skip += BATCH_SIZE;
      batchNum++;
    }

    console.log('Monthly progress emails cron job completed successfully.');
  } catch (error) {
    captureErrorWithContext(
      error,
      {
        operation: 'runMonthlyProgressEmailsCronJob',
      },
      {
        logLevel: 'error',
      },
    );
    throw error;
  } finally {
    await app.close();
    process.exit();
  }
}

if (require.main === module) {
  withSentry(() => withTimeout(runMonthlyProgressEmailsCronJob(), CRON_JOB_TIMEOUT_MS));
}
