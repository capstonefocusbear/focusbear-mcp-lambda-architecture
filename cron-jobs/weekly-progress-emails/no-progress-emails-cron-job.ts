/* eslint-disable no-console */
import { NestFactory } from '@nestjs/core';
import { getQueueToken } from '@nestjs/bull';
import { Queue } from 'bull';
import { AppModule } from '../../apps/api-server/src/app.module';
import { UserRepository } from '../../apps/api-server/src/modules/user/repositories/user.repository';
import { CRON_JOB_TIMEOUT_MS } from '../../apps/api-server/src/shared/utils/constants';
import { withSentry, captureErrorWithContext } from '../sentry';
import { withTimeout } from '../../apps/api-server/src/shared/utils/helpers';

const BATCH_SIZE = 40; // Process inactive users in batches

async function runNoProgressEmailsCronJob() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const userRepository = app.get(UserRepository);
  const emailQueue: Queue = app.get(getQueueToken('emailQueue'));

  try {
    console.log('Starting no-progress emails cron job...');
    
    // Get users who haven't been active in 7 days
    const users = await userRepository.getUsersForNoProgressEmails(7);
    console.log(`Found ${users.length} inactive users for re-engagement emails.`);

    // Process users in batches
    for (let i = 0; i < users.length; i += BATCH_SIZE) {
      const batch = users.slice(i, i + BATCH_SIZE);
      console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(users.length / BATCH_SIZE)} (${batch.length} users)`);
      
      const emailPromises = batch.map(async (user) => {
        try {
          // Queue the no-progress email job
          await emailQueue.add(
            'send-no-progress-email',
            {
              user,
            },
            {
              attempts: 3,
              backoff: {
                type: 'exponential',
                delay: 2000,
              },
              removeOnComplete: true,
              removeOnFail: false,
            }
          );

          console.log(`Queued no-progress email for user ${user.id}`);
        } catch (error) {
          captureErrorWithContext(error, {
            operation: 'queueNoProgressEmail',
            userId: user.id,
            extra: { 
              batchIndex: Math.floor(i / BATCH_SIZE),
            },
          }, {
            logLevel: 'error',
          });
        }
      });

      await Promise.all(emailPromises);
      
      // Delay between batches
      if (i + BATCH_SIZE < users.length) {
        console.log('Waiting 1.5 seconds before processing next batch...');
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }

    console.log('No-progress emails cron job completed successfully.');
  } catch (error) {
    captureErrorWithContext(error, {
      operation: 'runNoProgressEmailsCronJob',
    }, {
      logLevel: 'error',
    });
    throw error;
  } finally {
    await app.close();
    process.exit();
  }
}

if (require.main === module) {
  withSentry(() => withTimeout(runNoProgressEmailsCronJob(), CRON_JOB_TIMEOUT_MS));
}