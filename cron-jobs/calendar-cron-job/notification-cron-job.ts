// biome-ignore-all lint/suspicious/noConsole: cron job logging
import { BeamsPublishRequest } from '@app/pusher-beams/domains/pusher-beams-publish-request.model';
import { Between } from 'typeorm';
import { DateTime } from 'luxon';
import PushNotifications = require('@pusher/push-notifications-server');
import { Notification } from '../../apps/api-server/src/modules/notification/entities/notification.entity';
import { CronJobDataSource } from '../data-source';
import { logVerboselyIfUserHasVerboseLoggingEnabled } from '../utils/verbose-logging';
import { CalendarExcludedKeyword } from '../../apps/api-server/src/modules/calendar/entities/calendar-excluded-keywords.entity';
import { Calendar } from '../../apps/api-server/src/modules/calendar/entities/calendar.entity';
import { runCronWithTelemetry, captureErrorWithContext } from '../sentry';
import { withTimeout } from '../../apps/api-server/src/shared/utils/helpers';
import { CRON_JOB_TIMEOUT_MS } from '../../apps/api-server/src/shared/utils/constants';
// biome-ignore lint/style/noCommonJs: cron script uses require for dotenv
const dotenv = require('dotenv');

dotenv.config();
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
  const eventsToSend: typeof eventsWithUserLanguage = [];
  for (const event of eventsWithUserLanguage) {
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
      // biome-ignore lint/performance/noAwaitInLoops: await in loops is required here
      await logVerboselyIfUserHasVerboseLoggingEnabled(event.user_id, [
        'Skipping calendar notification because no calendars were selected',
        {
          notification_id: event.id,
          platform: event.platform,
          calendar_id: event.calendar_id,
        },
      ]);
      continue;
    }

    let canNotify = true;
    if (excludedKeywords.length > 0) {
      for (const element of excludedKeywords) {
        if (element.intitle && event.summary.includes(element.keyword)) {
          canNotify = false;
          // biome-ignore lint/performance/noAwaitInLoops: await in loops is required here
          await logVerboselyIfUserHasVerboseLoggingEnabled(event.user_id, [
            'Skipping calendar notification because of excluded title keyword',
            {
              notification_id: event.id,
              keyword: element.keyword,
            },
          ]);
          break;
        }

        if (element.indescription && event.description.includes(element.keyword)) {
          canNotify = false;
          await logVerboselyIfUserHasVerboseLoggingEnabled(event.user_id, [
            'Skipping calendar notification because of excluded description keyword',
            {
              notification_id: event.id,
              keyword: element.keyword,
            },
          ]);
          break;
        }
      }
    }

    if (canNotify) {
      eventsToSend.push(event);
    }
  }
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
  await logVerboselyIfUserHasVerboseLoggingEnabled(userId, [
    'Publishing calendar notification (verbose logging enabled)',
    {
      user_id: userId,
      notificationId: notificationData.id,
      summary: notificationData.summary,
    },
  ]);

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
    await logVerboselyIfUserHasVerboseLoggingEnabled(userId, [
      'Calendar notification Beams publish failed',
      {
        user_id: userId,
        error: (error as Error).message,
        stack: (error as Error).stack,
        notificationId: notificationData.id,
      },
    ]);
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
    return;
  }
  await logVerboselyIfUserHasVerboseLoggingEnabled(userId, [
    'Calendar notification Beams publish succeeded',
    {
      user_id: userId,
      notificationId: notificationData.id,
    },
  ]);
};

const updateNotificationStatus = async (id: string) => {
  await CronJobDataSource.manager.update(Notification, id, { received: true });
};

async function runNotificationCronJob() {
  await CronJobDataSource.initialize();
  try {
    const calendarEventsToSend = await fetchEvents();
    console.log(`Ran for ${calendarEventsToSend.length} notification(s).`);
    if (calendarEventsToSend.length === 0) {
      return { notificationsSent: 0 };
    }

    await Promise.all(
      calendarEventsToSend.map(async (calendarEvent) => {
        const { id, summary, description, event_begins, event_ends } = calendarEvent;
        await sendBeamsPushNotification(calendarEvent.user_id, calendarEvent.language, {
          id,
          summary,
          description,
          event_begins,
          event_ends,
        });
        await updateNotificationStatus(id);
      }),
    );

    return { notificationsSent: calendarEventsToSend.length };
  } finally {
    if (CronJobDataSource.isInitialized) {
      await CronJobDataSource.destroy().catch((error) => {
        console.error('Failed to destroy CronJobDataSource', error);
      });
    }
  }
}

if (require.main === module) {
  runCronWithTelemetry('calendar-notification-cron', () => withTimeout(runNotificationCronJob(), CRON_JOB_TIMEOUT_MS));
}
