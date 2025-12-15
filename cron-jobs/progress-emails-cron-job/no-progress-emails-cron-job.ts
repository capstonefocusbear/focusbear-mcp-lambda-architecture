/* eslint-disable no-console */
import { NestFactory } from '@nestjs/core';
import { getQueueToken } from '@nestjs/bull';
import { Queue } from 'bull';
import { AppModule } from '../../apps/api-server/src/app.module';
import { UserRepository } from '../../apps/api-server/src/modules/user/repositories/user.repository';
import { UserEmailPreferencesService } from '../../apps/api-server/src/modules/user/services/user-email-preferences/user-email-preferences.service';
import { Auth0ManagementService } from '@app/auth0';
import { CRON_JOB_TIMEOUT_MS } from '../../apps/api-server/src/shared/utils/constants';
import { runCronWithTelemetry, captureErrorWithContext } from '../sentry';
import { withTimeout } from '../../apps/api-server/src/shared/utils/helpers';

const BATCH_SIZE = 30; // Process inactive users in batches

async function runNoProgressEmailsCronJob() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const userRepository = app.get(UserRepository);
  const userEmailPreferencesService = app.get(UserEmailPreferencesService);
  const auth0ManagementService = app.get(Auth0ManagementService);
  const emailQueue: Queue = app.get(getQueueToken('emailQueue'));

  let emailsQueued = 0;
  let usersConsidered = 0;
  let failedEmails = 0;
  try {
    console.log('Starting no-progress emails cron job...');
    // Paginated batch processing to avoid OOM
    let skip = 0;
    let batchNum = 1;
    while (true) {
      const batch = await userRepository.getUsersForNoProgressEmailsBatch(skip, BATCH_SIZE, 7);
      if (batch.length === 0) break;
      usersConsidered += batch.length;
      console.log(`Processing batch ${batchNum} (${batch.length} users)`);

      const emailPromises = batch.map(async (user) => {
        try {
          // Fetch email from Auth0
          const { email } = await auth0ManagementService.getAuth0User(user.auth0_id);
          const userWithEmail = { ...user, email };

          // Generate unsubscribe token
          const unsubscribe_token = userEmailPreferencesService.generateUnsubscribeToken(user.id);

          // Queue the no-progress email job
          await emailQueue.add(
            'send-no-progress-email',
            {
              user: userWithEmail,
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

          console.log(`Queued no-progress email for user ${user.id}`);
          emailsQueued += 1;
          return { success: true };
        } catch (error) {
          captureErrorWithContext(
            error,
            {
              operation: 'queueNoProgressEmail',
              userId: user.id,
              extra: {
                batchIndex: batchNum - 1,
              },
            },
            {
              logLevel: 'error',
            },
          );
          return { success: false, error: error.message || 'Unknown error' };
        }
      });

      const results = await Promise.all(emailPromises);
      failedEmails += results.filter((result) => !result.success).length;

      // Delay between batches
      if (batch.length === BATCH_SIZE) {
        console.log('Waiting 1 second before processing next batch...');
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      skip += BATCH_SIZE;
      batchNum += 1;
    }

    console.log('No-progress emails cron job completed successfully.');
    return {
      emailsQueued,
      usersConsidered,
      failedEmails,
    };
  } catch (error) {
    captureErrorWithContext(
      error,
      {
        operation: 'runNoProgressEmailsCronJob',
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
  runCronWithTelemetry('no-progress-emails-cron', () => withTimeout(runNoProgressEmailsCronJob(), CRON_JOB_TIMEOUT_MS));
}
