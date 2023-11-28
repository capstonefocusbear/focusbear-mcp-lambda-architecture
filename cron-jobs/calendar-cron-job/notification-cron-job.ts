import { BeamsPublishRequest } from '@app/pusher-beams/domains/pusher-beams-publish-request.model';
import { Notification } from '../../apps/api-server/src/modules/notification/entities/notification.entity';
import { CronJobDataSource } from '../data-source';
import { Between } from 'typeorm';
/* eslint-disable @typescript-eslint/no-var-requires */
const PushNotifications = require('@pusher/push-notifications-server');
const dotenv = require('dotenv');
const { DateTime } = require('luxon');

dotenv.config();

async function fetchEvents () {
  const currentTime = DateTime.now().toISO();
  const timeInFiveMinutes = DateTime.now().plus({ minutes: 5 }).toISO();
  return CronJobDataSource.manager.find(Notification, {
    where: { event_begins: Between(currentTime, timeInFiveMinutes), received: false, },
  });
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

const updateNotificationStatus = async (id: string) => {
  await CronJobDataSource.manager.update(Notification, id, {received: true});
}

(async () => {
  try {
    await CronJobDataSource.initialize();
    const calendarEventsToSend = await fetchEvents();
    // eslint-disable-next-line no-console
    console.log(`Ran for ${calendarEventsToSend.length} notification(s).`);
    if (calendarEventsToSend.length === 0) process.exit();
    
    calendarEventsToSend.forEach(async (calendarEvent) => {
      const { id, summary, description, event_begins, event_ends } = calendarEvent;
      await sendBeamsPushNotification(calendarEvent.user_id, {
        id,
        summary,
        description,
        event_begins,
        event_ends,
      });
      await updateNotificationStatus(id);
    });
    process.exit();
  } catch (error) {
    console.error(error);
  }
})();
