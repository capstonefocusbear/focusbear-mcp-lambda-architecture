import { BeamsPublishRequest } from '@app/pusher-beams/domains/pusher-beams-publish-request.model';
import { Between } from 'typeorm';
import { DateTime } from 'luxon';
import PushNotifications = require('@pusher/push-notifications-server');
import { Notification } from '../../apps/api-server/src/modules/notification/entities/notification.entity';
import { CronJobDataSource } from '../data-source';
import { CalendarExcludedKeyword } from '../../apps/api-server/src/modules/calendar/entities/calendar-excluded-keywords.entity';
import { Calendar } from '../../apps/api-server/src/modules/calendar/entities/calendar.entity';
/* eslint-disable @typescript-eslint/no-var-requires */
const dotenv = require('dotenv');

dotenv.config();

async function fetchEvents() {
  const currentTime = DateTime.now().toJSDate();
  const timeInFiveMinutes = DateTime.now().plus({ minutes: 5 }).toJSDate();
  const events = await CronJobDataSource.manager.find(Notification, {
    where: { event_begins: Between(currentTime, timeInFiveMinutes), received: false },
  });
  const allExcludedKeywords = await CronJobDataSource.manager.find(CalendarExcludedKeyword, {
    where: {},
  });
  const allCalendars = await CronJobDataSource.manager.find(Calendar, {
    where: {
      is_selected: true,
    },
  });
  const eventsToSend = events.filter(async (event) => {
    const excludedKeywords = allExcludedKeywords.filter((keyword) => {
      return keyword.user_id === event.user_id && keyword.platform === event.platform;
    });
    const userCalendars = allCalendars.filter((calendar) => {
      return (
        calendar.user_id === event.user_id &&
        calendar.platform === event.platform &&
        calendar.platform_account === event.platform_account &&
        calendar.calendar_id === event.calendar_id
      );
    });
    if (userCalendars.length === 0) return false;
    if (excludedKeywords.length === 0) return true;
    let canNotify = true;
    excludedKeywords.forEach((element) => {
      if (element.intitle && event.summary.includes(element.keyword)) {
        canNotify = false;
      }
      if (element.indescription && event.description.includes(element.keyword)) {
        canNotify = false;
      }
    });
    return canNotify;
  });
  return eventsToSend;
}

const beamsClient = new PushNotifications({
  instanceId: process.env.PUSHER_BEAMS_INSTANCE_ID,
  secretKey: process.env.PUSHER_BEAMS_PRIMARY_KEY,
});

const sendBeamsPushNotification = async (userId: string, notificationData: Notification) => {
  try {
    const publishRequest: BeamsPublishRequest = {
      apns: {
        aps: {
          alert: {
            title: notificationData.summary,
            body: notificationData.description,
          },
        },
        data: notificationData,
      },
      fcm: {
        notification: {
          title: notificationData.summary,
          body: notificationData.description,
        },
        data: notificationData,
      },
    };
    await beamsClient.publishToUsers([userId], publishRequest);
  } catch (error) {
    console.error(error);
  }
};

const updateNotificationStatus = async (id: string) => {
  await CronJobDataSource.manager.update(Notification, id, { received: true });
};

(async () => {
  try {
    await CronJobDataSource.initialize();
    const calendarEventsToSend = await fetchEvents();
    // eslint-disable-next-line no-console
    console.log(`Ran for ${calendarEventsToSend.length} notification(s).`);
    if (calendarEventsToSend.length === 0) process.exit();
    const sendNotificationsPromises = calendarEventsToSend.map(async (calendarEvent) => {
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
    const updateNotificationStatusPromises = calendarEventsToSend.map(async (calendarEvent) => {
      const { id } = calendarEvent;
      await updateNotificationStatus(id);
    });
    await Promise.all(sendNotificationsPromises);
    await Promise.all(updateNotificationStatusPromises);
    // give me code to change the code above to send all the push notifications simultaneously
    process.exit();
  } catch (error) {
    console.error(error);
  }
})();
