import { BeamsPublishRequest } from '@app/pusher-beams/domains/pusher-beams-publish-request.model';
import { Notification } from '../../apps/api-server/src/modules/notification/entities/notification.entity';

/* eslint-disable @typescript-eslint/no-var-requires */
const { Pool } = require('pg');
const PushNotifications = require('@pusher/push-notifications-server');
const dotenv = require('dotenv');
const { DateTime } = require('luxon');

dotenv.config();

const { POSTGRES_HOST, POSTGRES_PORT, POSTGRES_USERNAME, POSTGRES_PASSWORD, POSTGRES_DB } = process.env;
const db_uri = process.env.RENDER_DB_CONNECTION_URI;
const connectionString = db_uri
  ? db_uri
  : `postgres://${POSTGRES_USERNAME}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}`;

const fetchNotifications = async () => {
  const pool = new Pool({ connectionString });
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

const sendBeamsPushNotification = async (userId: string, notificationData: Notification) => {
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
  await beamsClient.publishToUsers([userId], publishRequest);
};

(async () => {
  try {
    const notificationsToSend = await fetchNotifications();
    // eslint-disable-next-line no-console
    console.log(`Ran for ${notificationsToSend.length} notification(s).`);
    if (notificationsToSend.length === 0) process.exit();
    notificationsToSend.forEach(async (notification) => {
      const { id, summary, description, event_begins, event_ends } = notification;
      await sendBeamsPushNotification(notification.user_id, {
        id,
        summary,
        description,
        event_begins,
        event_ends,
      });
    });
    process.exit();
  } catch (error) {
    console.error(error);
  }
})();
