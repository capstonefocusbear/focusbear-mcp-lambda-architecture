/* eslint-disable linebreak-style */
import { BeamsPublishRequest } from '@app/pusher-beams/domains/pusher-beams-publish-request.model';
import { Between } from 'typeorm';
import { DateTime } from 'luxon';
import PushNotifications = require('@pusher/push-notifications-server');
import { Notification } from '../../apps/api-server/src/modules/notification/entities/notification.entity';
import { CronJobDataSource } from '../data-source';
import { CalendarExcludedKeyword } from '../../apps/api-server/src/modules/calendar/entities/calendar-excluded-keywords.entity';
import { Calendar } from '../../apps/api-server/src/modules/calendar/entities/calendar.entity';
import { withSentry, captureErrorWithContext } from '../sentry';
/* eslint-disable @typescript-eslint/no-var-requires */
const dotenv = require('dotenv');

dotenv.config();
const JEREMY_USER_ID = '9884b0af-dc9f-4207-964e-e4db537a2234';

async function fetchEvents() {
  const currentTime = DateTime.now().toJSDate();
  const timeInFiveMinutes = DateTime.now().plus({ minutes: 5 }).toJSDate();
  const events = await CronJobDataSource.manager.find(Notification, {
    where: { event_begins: Between(currentTime, timeInFiveMinutes), received: false },
    relations: ['user'],
    select: ['id', 'summary', 'description', 'event_begins', 'event_ends', 'user_id', 'user'],
  });

  console.log('eventsFromFetchEvents', JSON.stringify(events));

  const allExcludedKeywords = await CronJobDataSource.manager.find(CalendarExcludedKeyword, {
    where: {},
  });
  const allCalendars = await CronJobDataSource.manager.find(Calendar, {
    where: {
      is_selected: true,
    },
  });
  const eventsWithUserLanguage = events.map((event) => {
    return {
      ...event,
      language: event.user.language,
    };
  });
  const eventsToSend = eventsWithUserLanguage.filter(async (event) => {
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
    if (userCalendars.length === 0) {
      if (event.user_id === JEREMY_USER_ID) {
        console.log('Not triggering event because userCalendars.length is 0 ');
      }
      return false;
    }
    if (excludedKeywords.length === 0) return true;
    let canNotify = true;
    excludedKeywords.forEach((element) => {
      if (element.intitle && event.summary.includes(element.keyword)) {
        if (event.user_id === JEREMY_USER_ID) {
          console.log('Not triggering event because of excluded keyword title ', element.keyword);
        }
        canNotify = false;
      }
      if (element.indescription && event.description.includes(element.keyword)) {
        canNotify = false;
        if (event.user_id === JEREMY_USER_ID) {
          console.log('Not triggering event because of excluded keyword description', element.keyword);
        }
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

const NOTIFICATION_TITLES = {
  en: 'New calendar notification',
  es: 'Nueva notificación de calendario',
};

const sendBeamsPushNotification = async (userId: string, language: string, notificationData: Notification) => {
  if (userId === JEREMY_USER_ID) {
    console.log('Sending Notification to User, ', userId, JSON.stringify(notificationData));
  }

  try {
    const publishRequest: BeamsPublishRequest = {
      apns: {
        aps: {
          alert: {
            title: NOTIFICATION_TITLES[language],
            body: notificationData.summary,
          },
        },
      },
      fcm: {
        notification: {
          title: NOTIFICATION_TITLES[language],
          body: notificationData.summary,
        },
      },
    };
    await beamsClient.publishToUsers([userId], publishRequest);
  } catch (error) {
    captureErrorWithContext(error, {
      operation: 'sendBeamsPushNotification',
      cronJob: 'calendar-notification',
      userId,
      extra: {
        language,
        notificationId: notificationData.id,
        summary: notificationData.summary,
      },
    });
  }
};

const updateNotificationStatus = async (id: string) => {
  await CronJobDataSource.manager.update(Notification, id, { received: true });
};

async function runNotificationCronJob() {
  await CronJobDataSource.initialize();
  const calendarEventsToSend = await fetchEvents();
  // eslint-disable-next-line no-console
  console.log(`Ran for ${calendarEventsToSend.length} notification(s).`);
  if (calendarEventsToSend.length === 0) process.exit();
  const sendNotificationsPromises = calendarEventsToSend.map(async (calendarEvent) => {
    const { id, summary, description, event_begins, event_ends } = calendarEvent;
    await sendBeamsPushNotification(calendarEvent.user_id, calendarEvent.language, {
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
}

if (require.main === module) {
  withSentry(runNotificationCronJob);
}
