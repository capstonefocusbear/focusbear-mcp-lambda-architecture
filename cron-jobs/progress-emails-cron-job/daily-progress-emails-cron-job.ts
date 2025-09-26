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

const BATCH_SIZE = 15; // Smaller batches for daily emails

async function runDailyProgressEmailsCronJob() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const userRepository = app.get(UserRepository);
  const userProgressMetricsService = app.get(UserProgressMetricsService);
  const userEmailPreferencesService = app.get(UserEmailPreferencesService);
  const auth0ManagementService = app.get(Auth0ManagementService);
  const emailQueue: Queue = app.get(getQueueToken('emailQueue'));

  try {
    console.log('Starting daily progress emails cron job...');

    // Log initial memory usage
    const initialMemory = process.memoryUsage();
    console.log(`Initial memory usage: ${Math.round(initialMemory.heapUsed / 1024 / 1024)}MB heap, ${Math.round(initialMemory.rss / 1024 / 1024)}MB RSS`);

    // Process users in batches
    let skip = 0;
    let batchNum = 1;
    while (true) {
      const batch = await userRepository.getUsersForDailyEmailsBatch(skip, BATCH_SIZE);
      if (batch.length === 0) break;
      const batchMemory = process.memoryUsage();
      console.log(
         `Processing batch ${batchNum} (${batch.length} users) - Memory: ${Math.round(batchMemory.heapUsed / 1024 / 1024)}MB heap`
      );

      const emailPromises = batch.map(async (user) => {
        try {
          // Fetch email from Auth0
          const { email } = await auth0ManagementService.getAuth0User(user.auth0_id);
          const userWithEmail = { ...user, email };

          // For daily emails, calculate "weekly" progress for the past 7 days
          const weekStart = new Date();
          weekStart.setDate(weekStart.getDate() - 7);

          const metrics = await userProgressMetricsService.calculateWeeklyProgress(user, weekStart);

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

          console.log(`Queued daily progress email for user ${user.id}`);
        } catch (error) {
          captureErrorWithContext(
            error,
            {
              operation: 'queueDailyProgressEmail',
              userId: user.id,
              extra: {
                batchIndex: batchNum - 1,
              },
            },
            {
              logLevel: 'error',
            },
          );
          console.error(`Failed to queue daily progress email for user ${user.id}:`, error);
          return { success: false, error: error.message || 'Unknown error' };
        }
      });

      await Promise.all(emailPromises);

      // Delay between batches
      if (i + BATCH_SIZE < users.length) {
        console.log('Waiting 1 second before processing next batch...');
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    console.log('Daily progress emails cron job completed successfully.');
  } catch (error) {
    captureErrorWithContext(
      error,
      {
        operation: 'runDailyProgressEmailsCronJob',
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
  withSentry(() => withTimeout(runDailyProgressEmailsCronJob(), CRON_JOB_TIMEOUT_MS));
}
