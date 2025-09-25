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
import { runCronWithTelemetry, captureErrorWithContext } from '../sentry';
import { withTimeout } from '../../apps/api-server/src/shared/utils/helpers';

const BATCH_SIZE = 30; // Smaller batches for daily emails

async function runDailyProgressEmailsCronJob() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const userRepository = app.get(UserRepository);
  const userProgressMetricsService = app.get(UserProgressMetricsService);
  const userEmailPreferencesService = app.get(UserEmailPreferencesService);
  const auth0ManagementService = app.get(Auth0ManagementService);
  const emailQueue: Queue = app.get(getQueueToken('emailQueue'));

  let emailsQueued = 0;
  let usersConsidered = 0;
  try {
    console.log('Starting daily progress emails cron job...');

    // Use repository method for getting users eligible for daily emails
    const users = await userRepository.getUsersForDailyEmails();
    usersConsidered = users.length;
    console.log(`Found ${usersConsidered} users for daily emails.`);

    // Process users in batches
    for (let i = 0; i < users.length; i += BATCH_SIZE) {
      const batch = users.slice(i, i + BATCH_SIZE);
      console.log(
        `Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(users.length / BATCH_SIZE)} (${
          batch.length
        } users)`,
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
          emailsQueued += 1;
        } catch (error) {
          captureErrorWithContext(
            error,
            {
              operation: 'queueDailyProgressEmail',
              userId: user.id,
              extra: {
                batchIndex: Math.floor(i / BATCH_SIZE),
              },
            },
            {
              logLevel: 'error',
            },
          );
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
    return {
      emailsQueued,
      usersConsidered,
    };
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
  }
}

if (require.main === module) {
  runCronWithTelemetry('daily-progress-emails-cron', () => withTimeout(runDailyProgressEmailsCronJob(), CRON_JOB_TIMEOUT_MS));
}
