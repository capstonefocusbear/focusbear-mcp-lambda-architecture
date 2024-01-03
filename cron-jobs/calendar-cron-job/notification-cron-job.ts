import { BeamsPublishRequest } from '@app/pusher-beams/domains/pusher-beams-publish-request.model';
import { Notification } from '../../apps/api-server/src/modules/notification/entities/notification.entity';
import { CronJobDataSource } from '../data-source';
import { Between } from 'typeorm';
import { CalendarExcludedKeyword } from '../../apps/api-server/src/modules/calendar/entities/calendar-excluded-keywords.entity';
import { Calendar } from '../../apps/api-server/src/modules/calendar/entities/calendar.entity';
/* eslint-disable @typescript-eslint/no-var-requires */
const PushNotifications = require('@pusher/push-notifications-server');
const dotenv = require('dotenv');
const { DateTime } = require('luxon');

dotenv.config();

async function fetchEvents () {
  const currentTime = DateTime.now().toISO();
  const timeInFiveMinutes = DateTime.now().plus({ minutes: 5 }).toISO();
  const events = await CronJobDataSource.manager.find(Notification, {
    where: { event_begins: Between(currentTime, timeInFiveMinutes), received: false, },
  });
  const filteredEvents = await events.filter(async (event) => {
    const excludedKeywords = await CronJobDataSource.manager.find(CalendarExcludedKeyword, {
      where: {
        user_id: event.user_id, 
        platform: event.platform
      }
    });
    const existingCalendar = await CronJobDataSource.manager.find(Calendar, {
      where: {
        user_id: event.user_id, 
        platform: event.platform, 
        platform_account: event.platform_account, 
        is_selected: true
      }
    });
    if (!existingCalendar) return false;
    if (!excludedKeywords) return true;
    let canNotificate = true;
    excludedKeywords.forEach(element => {
        if (element.intitle && event.summary.includes(element.keyword)) {
          canNotificate = false;
        }
        if (element.indescription && event.description.includes(element.keyword)) {
          canNotificate = false;
        }
    });
    return canNotificate;
  });
  return filteredEvents;
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
