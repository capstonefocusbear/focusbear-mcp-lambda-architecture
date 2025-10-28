import { BeamsPublishRequest } from '@app/pusher-beams/domains/pusher-beams-publish-request.model';
import { Notification } from '../../apps/api-server/src/modules/notification/entities/notification.entity';
import { runCronWithTelemetry } from '../sentry';
import { withTimeout } from '../../apps/api-server/src/shared/utils/helpers';
import { CRON_JOB_TIMEOUT_MS } from '../../apps/api-server/src/shared/utils/constants';
import { CronJobDataSource } from '../data-source';
import { User } from '../../apps/api-server/src/modules/user/entities/user.entity';

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
  await pool.connect();
  const currentTime = DateTime.now().toISO();
  const timeInFifteenMinutes = DateTime.now().plus({ minutes: 15 }).toISO();
  const res = await pool.query({
    text: 'SELECT * FROM notifications WHERE event_begins >= $1 AND event_begins <= $2 AND received IS NOT TRUE;',
    values: [currentTime, timeInFifteenMinutes],
  });
  return res.rows;
};

const beamsClient = new PushNotifications({
  instanceId: process.env.PUSHER_BEAMS_INSTANCE_ID,
  secretKey: process.env.PUSHER_BEAMS_PRIMARY_KEY,
});

const checkUserVerboseLogging = async (user_id: string): Promise<boolean> => {
  try {
    const user = await CronJobDataSource.getRepository(User).findOneBy({ id: user_id });
    return user?.verbose_logging || false;
  } catch (error) {
    console.error('Error checking verbose logging for user:', user_id, error);
    return false;
  }
};

const logVerboselyIfUserHasVerboseLoggingEnabled = async (user_id: string, logFunction: () => void): Promise<void> => {
  try {
    const isVerboseLoggingAllowed = await checkUserVerboseLogging(user_id);
    if (isVerboseLoggingAllowed) {
      logFunction();
    }
  } catch (error) {
    // Silently fail if we can't check verbose logging status
  }
};

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
  await logVerboselyIfUserHasVerboseLoggingEnabled(user_id, () => {
    // eslint-disable-next-line no-console
    console.log('Publishing Pusher Beams notification for scheduled notification (verbose logging enabled):', {
      user_id,
      notificationData,
      publishRequest: JSON.stringify(publishRequest),
    });
  });

  try {
    await beamsClient.publishToUsers([user_id], publishRequest);

    await logVerboselyIfUserHasVerboseLoggingEnabled(user_id, () => {
      // eslint-disable-next-line no-console
      console.log('Pusher Beams notification published successfully for scheduled notification:', user_id);
    });
  } catch (error) {
    await logVerboselyIfUserHasVerboseLoggingEnabled(user_id, () => {
      // eslint-disable-next-line no-console
      console.error('Pusher Beams notification failed for scheduled notification:', {
        user_id,
        error: error.message,
        stack: error.stack,
        notificationData,
      });
    });
    throw error;
  }
};

async function runPusherCronJob() {
  // Initialize data source for user verbose logging checks
  await CronJobDataSource.initialize();

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
}

if (require.main === module) {
  runCronWithTelemetry('pusher-cron', () => withTimeout(runPusherCronJob(), CRON_JOB_TIMEOUT_MS));
}
