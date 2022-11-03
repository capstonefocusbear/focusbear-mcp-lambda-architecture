import { BeamsPublishRequest } from '@app/pusher-beams/domains/pusher-beams-publish-request.model';
import { Notification } from './apps/api-server/src/modules/notification/entities/notification.entity';

/* eslint-disable @typescript-eslint/no-var-requires */
const { Pool } = require('pg');
const PushNotifications = require('@pusher/push-notifications-server');
const dotenv = require('dotenv');
const moment = require('moment');

dotenv.config();

dotenv.config();

const fetchNotifications = async () => {
  try {
    const pool = new Pool({
      user: process.env.POSTGRES_USERNAME,
      host: process.env.POSTGRES_HOST,
      database: process.env.POSTGRES_DB,
      password: process.env.POSTGRES_PASSWORD,
      port: Number(process.env.POSTGRES_PORT) || 5432,
    });
    await pool.connect();
    const currentTime = new Date();
    const timeInFifiteenMinutes = moment(currentTime).add(15, 'm').toDate();
    const res = await pool.query({
      text: 'SELECT * FROM notifications WHERE event_begins >= $1 AND event_begins <= $2 AND received IS NOT TRUE;',
      values: [currentTime, timeInFifiteenMinutes],
    });
    return res.rows;
  } catch (error) {
    console.error(error);
  }
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
  const notificationsToSend = await fetchNotifications();
  if (notificationsToSend.length === 0) return;
  notificationsToSend.forEach((notification) => {
    const { id, summary, description, event_begins, event_ends } = notification;
    sendBeamsPushNotification(notification.user_id, {
      id,
      summary,
      description,
      event_begins,
      event_ends,
    });
  });
})();
