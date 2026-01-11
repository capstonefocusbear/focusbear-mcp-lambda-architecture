import { BeamsPublishRequest } from '@app/pusher-beams/domains/pusher-beams-publish-request.model';
import { Notification } from '../../apps/api-server/src/modules/notification/entities/notification.entity';
import { runCronWithTelemetry } from '../sentry';
import { withTimeout } from '../../apps/api-server/src/shared/utils/helpers';
import { CRON_JOB_TIMEOUT_MS } from '../../apps/api-server/src/shared/utils/constants';
import { CronJobDataSource } from '../data-source';
import {
  logVerboselyIfUserHasVerboseLoggingEnabled,
} from '../utils/verbose-logging';

/* eslint-disable @typescript-eslint/no-var-requires */
const { Pool } = require('pg');
const PushNotifications = require('@pusher/push-notifications-server');
const dotenv = require('dotenv');
const { DateTime } = require('luxon');

dotenv.config();

const { POSTGRES_HOST, POSTGRES_PORT, POSTGRES_USERNAME, POSTGRES_PASSWORD, POSTGRES_DB } = process.env;
const db_uri = process.env.RENDER_DB_CONNECTION_URI;
const connectionString =
  db_uri || `postgres://${POSTGRES_USERNAME}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}`;

const poolConfig = {
  connectionString,
  ssl: process.env.AWS_REGION ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 10,
};

const fetchNotifications = async () => {
  const pool = new Pool(poolConfig);
  try {
    const currentTime = DateTime.now().toISO();
    const timeInFifteenMinutes = DateTime.now().plus({ minutes: 15 }).toISO();
    const res = await pool.query({
      text: 'SELECT * FROM notifications WHERE event_begins >= $1 AND event_begins <= $2 AND received IS NOT TRUE;',
      values: [currentTime, timeInFifteenMinutes],
    });
    return res.rows;
  } finally {
    await pool.end().catch((error) => {
      // eslint-disable-next-line no-console
      console.error('Failed to close PG pool', error);
    });
  }
};

const beamsClient = new PushNotifications({
  instanceId: process.env.PUSHER_BEAMS_INSTANCE_ID,
  secretKey: process.env.PUSHER_BEAMS_PRIMARY_KEY,
});

const sendBeamsPushNotification = async (user_id: string, notificationData: Notification) => {
  const publishRequest: BeamsPublishRequest = {
    apns: {
      aps: {},
      data: {
        notificationData,
      },
    },
    fcm: {
      data: {
        notificationData,
      },
    },
  };

  // Verbose logging for push notification
  await logVerboselyIfUserHasVerboseLoggingEnabled(user_id, [
    'Publishing Pusher Beams notification for scheduled notification (verbose logging enabled):',
    {
      user_id,
      notificationData,
      publishRequest: JSON.stringify(publishRequest),
    },
  ]);

  try {
    await beamsClient.publishToUsers([user_id], publishRequest);

    await logVerboselyIfUserHasVerboseLoggingEnabled(user_id, [
      'Pusher Beams notification published successfully for scheduled notification:',
      user_id,
    ]);
  } catch (error) {
    await logVerboselyIfUserHasVerboseLoggingEnabled(user_id, [
      'Pusher Beams notification failed for scheduled notification:',
      {
        user_id,
        error: (error as Error).message,
        stack: (error as Error).stack,
        notificationData,
      },
    ]);
    throw error;
  }
};

async function runPusherCronJob() {
  // Initialize data source for user verbose logging checks
  if (!CronJobDataSource.isInitialized) {
    await CronJobDataSource.initialize();
  }

  try {
    const notificationsToSend = await fetchNotifications();
    // eslint-disable-next-line no-console
    console.log(`Ran for ${notificationsToSend.length} notification(s).`);
    if (notificationsToSend.length === 0) {
      return { notificationsSent: 0 };
    }

    await Promise.all(
      notificationsToSend.map(async (notification) => {
        const { id, summary, description, event_begins, event_ends } = notification;
        await sendBeamsPushNotification(notification.user_id, {
          id,
          summary,
          description,
          event_begins,
          event_ends,
        });
      }),
    );

    return { notificationsSent: notificationsToSend.length };
  } finally {
    if (CronJobDataSource.isInitialized) {
      await CronJobDataSource.destroy().catch((error) => {
        // eslint-disable-next-line no-console
        console.error('Failed to destroy CronJobDataSource', error);
      });
    }
  }
}

if (require.main === module) {
  runCronWithTelemetry('pusher-cron', () => withTimeout(runPusherCronJob(), CRON_JOB_TIMEOUT_MS));
}
