/* eslint-disable no-console */
import { NestFactory } from '@nestjs/core';
import { getQueueToken } from '@nestjs/bull';
import { Queue } from 'bull';
import { DateTime } from 'luxon';
import { LessThan, MoreThan } from 'typeorm';
import { ManagementClient } from 'auth0';
import axios from 'axios';
import Stripe from 'stripe';
import { AppModule } from '../../apps/api-server/src/app.module';
import { CronJobDataSource } from '../data-source';
import { User, EmailFrequency } from '../../apps/api-server/src/modules/user/entities/user.entity';
import { UserProgressMetricsService } from '../../apps/api-server/src/modules/user/services/user-progress-metrics/user-progress-metrics.service';
import { UserEmailPreferencesService } from '../../apps/api-server/src/modules/user/services/user-email-preferences/user-email-preferences.service';
import { STRIPE_API_VERSION } from '../../apps/api-server/src/shared/utils/constants';
import { withSentry, captureErrorWithContext } from '../sentry';
import { withTimeout } from '../../apps/api-server/src/shared/utils/helpers';
import { CRON_JOB_TIMEOUT_MS } from '../../apps/api-server/src/shared/utils/constants';

const BATCH_SIZE = 25; // Process users in smaller batches for inactive users

const auth0 = new ManagementClient({
  domain: process.env.AUTH0_DOMAIN,
  clientId: process.env.AUTH0_MANAGEMENT_CLIENT_ID,
  clientSecret: process.env.AUTH0_MANAGEMENT_CLIENT_SECRET,
});

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: STRIPE_API_VERSION });

async function getInactiveUsers() {
  const currentDate = DateTime.now();
  const fiveMonthsAgo = currentDate.minus({ months: 5 });
  const inactiveUsers = await CronJobDataSource.manager.find(User, {
    where: {
      updated_at: LessThan(fiveMonthsAgo.toString()),
      has_received_inactivity_warning: false,
    },
  });
  console.log(`Found ${inactiveUsers.length} inactive users without inactivity warnings`);
  const userInfoPromise = inactiveUsers.map(async (user) => {
    try {
      const auth0User = (await auth0.users.get({ id: user.auth0_id })) as { email?: string };
      return { email: auth0User.email || null, user };
    } catch (error) {
      captureErrorWithContext(error, {
        operation: 'getInactiveUsers.getUserEmail',
        cronJob: 'inactive-accounts',
        userId: user.id,
        extra: {
          auth0Id: user.auth0_id,
        },
      });
      return null;
    }
  });
  const userInfo = await Promise.all(userInfoPromise);
  return userInfo.filter((user) => user.email);
}

async function getActiveUsers() {
  const currentDate = DateTime.now();
  const sevenDaysAgo = currentDate.minus({ days: 7 });
  const activeUsers = await CronJobDataSource.manager.find(User, {
    where: { updated_at: MoreThan(sevenDaysAgo.toString()) },
  });
  console.log(`Found ${activeUsers.length} recently active users`);
  const userInfoPromise = activeUsers.map(async (user) => {
    try {
      const auth0User = (await auth0.users.get({ id: user.auth0_id })) as { email?: string };
      return { email: auth0User.email || null, user };
    } catch (error) {
      captureErrorWithContext(error, {
        operation: 'getActiveUsers.getUserEmail',
        cronJob: 'inactive-accounts',
        userId: user.id,
        extra: {
          auth0Id: user.auth0_id,
        },
      });
      return null;
    }
  });
  const userInfo = await Promise.all(userInfoPromise);
  return userInfo.filter((user) => user.email);
}

async function sendEnhancedInactivityWarningEmails(users: { email: string; user: User }[], emailQueue: Queue) {
  for (let i = 0; i < users.length; i += BATCH_SIZE) {
    const batch = users.slice(i, i + BATCH_SIZE);

    const emailPromises = batch.map(async (userData) => {
      try {
        await emailQueue.add(
          'send-inactivity-warning-email',
          {
            user: { ...userData.user, email: userData.email },
            warningType: 'account_deletion',
            daysUntilDeletion: 30,
          },
          {
            attempts: 3,
            backoff: { type: 'exponential', delay: 2000 },
            removeOnComplete: true,
            removeOnFail: false,
          },
        );
      } catch (error) {
        captureErrorWithContext(error, {
          operation: 'sendEnhancedInactivityWarningEmails',
          userId: userData.user.id,
          cronJob: 'inactive-accounts',
        });
      }
    });

    await Promise.all(emailPromises);

    if (i + BATCH_SIZE < users.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

async function sendEnhancedNoProgressEmails(users: { email: string; user: User }[], emailQueue: Queue) {
  for (let i = 0; i < users.length; i += BATCH_SIZE) {
    const batch = users.slice(i, i + BATCH_SIZE);

    const emailPromises = batch.map(async (userData) => {
      try {
        await emailQueue.add(
          'send-no-progress-email',
          {
            user: { ...userData.user, email: userData.email },
            context: 'inactive_user_encouragement',
          },
          {
            attempts: 3,
            backoff: { type: 'exponential', delay: 2000 },
            removeOnComplete: true,
            removeOnFail: false,
          },
        );
      } catch (error) {
        captureErrorWithContext(error, {
          operation: 'sendEnhancedNoProgressEmails',
          userId: userData.user.id,
          cronJob: 'inactive-accounts',
        });
      }
    });

    await Promise.all(emailPromises);

    if (i + BATCH_SIZE < users.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

async function sendEnhancedProgressEmails(
  users: { email: string; user: User }[],
  emailQueue: Queue,
  userProgressMetricsService: UserProgressMetricsService,
  userEmailPreferencesService: UserEmailPreferencesService,
) {
  for (let i = 0; i < users.length; i += BATCH_SIZE) {
    const batch = users.slice(i, i + BATCH_SIZE);

    const emailPromises = batch.map(async (userData) => {
      if (userData.user.email_frequency === EmailFrequency.WEEKLY) {
        try {
          // Calculate progress metrics
          const metrics = await userProgressMetricsService.calculateWeeklyProgress(userData.user);

          // Get unsubscribe token
          const { unsubscribe_token } = await userEmailPreferencesService.getEmailPreferences(userData.user.id);

          // Queue enhanced progress email
          await emailQueue.add(
            'send-enhanced-progress-email',
            {
              user: { ...userData.user, email: userData.email },
              metrics,
              unsubscribe_token,
              emailType: 'inactive_user_progress',
            },
            {
              attempts: 3,
              backoff: { type: 'exponential', delay: 2000 },
              removeOnComplete: true,
              removeOnFail: false,
            },
          );
        } catch (error) {
          captureErrorWithContext(error, {
            operation: 'sendEnhancedProgressEmails',
            userId: userData.user.id,
            cronJob: 'inactive-accounts',
          });
        }
      }
    });

    await Promise.all(emailPromises);

    // Delay between batches
    if (i + BATCH_SIZE < users.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

async function updateUsersInactivityWarningFields(users: { user: User }[]) {
  const updatedUsers = users.map((userData) => {
    const updatedUser = { ...userData.user };
    updatedUser.has_received_inactivity_warning = true;
    return updatedUser;
  });
  await CronJobDataSource.manager.save(User, updatedUsers);
}

function logInactiveUsers(users: { user: User }[]) {
  console.log('Users that have been inactive for 5 months or longer:');
  for (const user of users) {
    console.log({ id: user.user.id, updated_at: user.user.updated_at });
  }
}

async function getUsersToDelete() {
  const currentDate = DateTime.now();
  const sixMonthsAgo = currentDate.minus({ months: 6 });
  return CronJobDataSource.manager.find(User, {
    where: { updated_at: LessThan(sixMonthsAgo.toString()), has_received_inactivity_warning: true },
  });
}

async function deleteUserFromRevenueCat(user_id: string) {
  const callUrl = `https://api.revenuecat.com/v1/subscribers/${user_id}`;
  const Authorization = `Bearer ${process.env.REVENUE_CAT_SECRET_KEY}`;
  const headers = { Authorization, accept: 'application/json', 'Content-Type': 'application/json' };
  await axios.delete(callUrl, { headers });
}

async function deleteUsers(users: User[]) {
  for await (const user of users) {
    const auth0Promise = auth0.users.delete({ id: user.auth0_id });
    const revenueCatPromise = deleteUserFromRevenueCat(user.id);
    const stripePromise = stripe.customers.del(user.stripe_customer_id);
    const userRepositoryPromise = CronJobDataSource.manager.delete(User, user.id);
    await Promise.all([auth0Promise, revenueCatPromise, stripePromise, userRepositoryPromise]);
  }
}

async function getInternalTestUsers() {
  const currentDate = DateTime.now();
  const sixMonthsAgo = currentDate.minus({ months: 6 });
  const inactiveUsers = await CronJobDataSource.manager.find(User, {
    where: { updated_at: LessThan(sixMonthsAgo.toString()) },
  });

  if (inactiveUsers.length === 0) {
    return [];
  }

  // Construct a query to fetch all users by their Auth0 IDs
  const userIds = inactiveUsers.map((user) => user.auth0_id);
  const query = `user_id:(${userIds.join(' OR ')})`;

  try {
    // Fetch all Auth0 users at once
    const auth0Users = await auth0.users.getAll({ q: query, search_engine: 'v3' });

    // Create a map for quick lookups
    const auth0UsersMap = new Map(auth0Users.data.map((u) => [u.user_id, u]));

    const internalTestUsers = [];
    for (const user of inactiveUsers) {
      const auth0User = auth0UsersMap.get(user.auth0_id);
      if (auth0User?.email && auth0User.email.match(/^internaltest\+.*@focusbear\.io$/)) {
        internalTestUsers.push({ email: auth0User.email, user });
      }
    }
    return internalTestUsers;
  } catch (error) {
    console.error('Error fetching bulk Auth0 users:', error);
    return [];
  }
}

async function deleteInternalTestUsers() {
  try {
    console.log('Starting internal test user cleanup...');

    const internalTestUsers = await getInternalTestUsers();

    if (internalTestUsers.length === 0) {
      console.log('No internal test users found.');
      return;
    }

    // Log users that will be deleted for safety
    console.log(`Found ${internalTestUsers.length} internal test users to delete:`);
    for (const testUser of internalTestUsers) {
      console.log(`- User ID: ${testUser.user.id}, Email: ${testUser.email}`);
    }

    // Extract just the User objects for deletion
    const usersToDelete = internalTestUsers.map((userData) => userData.user);

    console.log('Deleting internal test users...');
    await deleteUsers(usersToDelete);

    console.log('Internal test users deleted successfully.');
  } catch (error) {
    console.error('Error deleting internal test users:', error);
    throw error;
  }
}

async function runInactiveAccountsCronJob() {
  // Initialize NestJS application context
  const app = await NestFactory.createApplicationContext(AppModule);
  const emailQueue: Queue = app.get(getQueueToken('emailQueue'));
  const userProgressMetricsService = app.get(UserProgressMetricsService);
  const userEmailPreferencesService = app.get(UserEmailPreferencesService);

  try {
    await CronJobDataSource.initialize();

    console.log('Starting inactive accounts cron job...');

    // Get users for deletion (6+ months inactive with warning)
    const usersToDelete = await getUsersToDelete();
    if (usersToDelete.length > 0) {
      console.log(`Found ${usersToDelete.length} users who exceeded inactivity period`);
      // TODO: Uncomment when warning emails are fully implemented and tested
      // await deleteUsers(usersToDelete);
      console.log('User deletion is currently disabled pending warning email implementation');
    }

    // Get users for inactivity warning (5+ months inactive, no warning sent)
    const inactiveUsers = await getInactiveUsers();
    if (inactiveUsers.length > 0) {
      console.log(`Sending inactivity warnings to ${inactiveUsers.length} users`);
      await sendEnhancedInactivityWarningEmails(inactiveUsers, emailQueue);
      await updateUsersInactivityWarningFields(inactiveUsers);
    }

    // Get recently active users for progress emails
    const activeUsers = await getActiveUsers();
    if (activeUsers.length > 0) {
      console.log(`Sending progress emails to ${activeUsers.length} active users`);
      await sendEnhancedProgressEmails(
        activeUsers,
        emailQueue,
        userProgressMetricsService,
        userEmailPreferencesService,
      );
    }

    // Clean up internal test users
    await deleteInternalTestUsers();

    console.log('Inactive accounts cron job completed successfully');
  } catch (error) {
    captureErrorWithContext(
      error,
      {
        operation: 'runInactiveAccountsCronJob',
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
  withSentry(() => withTimeout(runInactiveAccountsCronJob(), CRON_JOB_TIMEOUT_MS));
}
