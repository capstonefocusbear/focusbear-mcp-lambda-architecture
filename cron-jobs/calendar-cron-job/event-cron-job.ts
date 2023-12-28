import axios from 'axios';
import { In, MoreThan } from 'typeorm';
import { calendar_v3, google } from 'googleapis';
import { DateTime } from 'luxon';
import { CronJobDataSource } from '../data-source';
import { PlatformIntegration } from '../../apps/api-server/src/modules/platform-integrations/entities/platform-integration.entity';
import { CalendarPlatforms } from '../../apps/api-server/src/modules/platform-integrations/domain/calendar-platforms.enum';
import { Notification } from '../../apps/api-server/src/modules/notification/entities/notification.entity';
import { MicrosoftCalendarEventDto } from '../../apps/api-server/src/modules/calendar/dto/microsoft-calendar-event.dto';
import { Calendar } from '../../apps/api-server/src/modules/calendar/entities/calendar.entity';

/* eslint-disable @typescript-eslint/no-var-requires */

require('dotenv').config();

const notificationGoogleAdapter = ({
  event,
  userId,
  calendarId,
}: {
  event: calendar_v3.Schema$Event;
  userId: string;
  calendarId: string;
}) => {
  const { id, summary, description, start, end, creator } = event;
  const { date, dateTime: event_begins } = start;
  const { dateTime: event_ends } = end;
  const { email: accountId } = creator;
  if (date) {
    return;
  }
  return new Notification({
    user_id: userId,
    platform: CalendarPlatforms.GOOGLE,
    platform_account: accountId,
    calendar_id: calendarId,
    external_id: id,
    summary,
    description,
    event_begins: new Date(event_begins),
    event_ends: new Date(event_ends),
    external_metadata: event,
  });
};

const notificationMicrosoftAdapter = ({
  event,
  userId,
  calendarId,
  accountId,
}: {
  event: MicrosoftCalendarEventDto;
  userId: string;
  calendarId: string;
  accountId: string;
}) => {
  const { id, subject, bodyPreview, start, end, isAllDay } = event;
  const { dateTime: event_begins } = start;
  const { dateTime: event_ends } = end;
  if (isAllDay) return;

  return new Notification({
    user_id: userId,
    platform: CalendarPlatforms.MICROSOFT,
    calendar_id: calendarId,
    platform_account: accountId,
    external_id: id,
    summary: subject,
    description: bodyPreview,
    event_begins: new Date(event_begins),
    event_ends: new Date(event_ends),
    external_metadata: event,
  });
};

async function getGoogleEvent({
  userId,
  calendarId,
  calendar,
}: {
  userId: string;
  calendarId: string;
  calendar: calendar_v3.Calendar;
}) {
  const { data } = await calendar.events.list({
    calendarId,
    timeMin: new Date().toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
  });

  return data.items.map((event) => notificationGoogleAdapter({ event, userId, calendarId }));
}

async function getGoogleEvents(userId: string, account: string) {
  const platform = CalendarPlatforms.GOOGLE;
  // get platform integration data accoding to userId and accountId.
  const record = await CronJobDataSource.manager.findOne(PlatformIntegration, {
    where: { user_id: userId, platform, external_user_id: account },
  });
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const callbackUrl = process.env.GOOGLE_CALLBACK_URL;

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, callbackUrl);
  oauth2Client.setCredentials(record.data);
  // Refresh access token using refresh token already provided
  if (record.data.expiry_date < DateTime.local().toMillis() + 1000) {
    return [];
  }

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  const { data: googleCalendars } = await calendar.calendarList.list();
  const { items: calendarList } = googleCalendars;
  const calendarsFromGoogleIds: string[] = calendarList.map((googleCalendar) => googleCalendar.id);
  const syncedGoogleCalendars = await CronJobDataSource.manager.find(Calendar, {
    where: { calendar_id: In(calendarsFromGoogleIds), user_id: userId, platform, is_selected: true },
  });
  const syncedGoogleCalendarIds = syncedGoogleCalendars.map((syncedCalendar) => syncedCalendar.calendar_id);

  // fetch events from only selected calendars
  const events = await Promise.all(
    calendarsFromGoogleIds
      .filter((calendarId) => syncedGoogleCalendarIds.includes(calendarId))
      .map(async (calendarId) => getGoogleEvent({ userId, calendarId, calendar })),
  );

  return events.flat().filter((event) => !!event);
}

async function getMicrosoftEvent({
  userId,
  calendarId,
  headers,
  accountId,
}: {
  userId: string;
  calendarId: string;
  headers: any;
  accountId: string;
}) {
  const baseUrl = 'https://graph.microsoft.com/v1.0';
  const { data: eventData } = await axios.get(`${baseUrl}/me/calendars/${calendarId}/events`, {
    headers,
    params: {
      $filter: `start/dateTime ge '${new Date().toISOString()}'`,
      $orderby: 'start/dateTime',
    },
  });
  const { value: eventList } = eventData;
  return eventList.map((event) => notificationMicrosoftAdapter({ event, calendarId, userId, accountId }));
}

async function getMicrosoftEvents(userId: string, accountId: string) {
  const platform = CalendarPlatforms.MICROSOFT;
  // get platform integration data accoding to userId and accountId.
  const record = await CronJobDataSource.manager.findOne(PlatformIntegration, {
    where: { user_id: userId, platform, external_user_id: accountId },
  });
  const { access_token } = record.data;
  const baseUrl = 'https://graph.microsoft.com/v1.0';
  if (!record.data.expiry_date || record.data.expiry_date < DateTime.local().toMillis() + 1000) {
    return [];
  }
  const headers = {
    Authorization: `Bearer ${access_token}`,
  };
  const { data: microsoftCalendars } = await axios.get(`${baseUrl}/me/calendars`, { headers });
  const { value: calendarList } = microsoftCalendars;
  const calendarsFromMicroSoftIds: string[] = calendarList.map((microsoftCalendar) => microsoftCalendar.id);
  const syncedMicrosoftCalendars = await CronJobDataSource.manager.find(Calendar, {
    where: { calendar_id: In(calendarsFromMicroSoftIds), user_id: userId, platform, is_selected: true },
  });
  const syncedMicrosoftCalendarIds = syncedMicrosoftCalendars.map((microsoftCalendar) => microsoftCalendar.calendar_id);
  // fetch events from only selected calendars
  const events = await Promise.all(
    calendarsFromMicroSoftIds
      .filter((calenarId) => syncedMicrosoftCalendarIds.includes(calenarId))
      .map(async (calendarId) => getMicrosoftEvent({ userId, calendarId, headers, accountId })),
  );

  return events.flat().filter((event) => !!event);
}

async function getAllUserEvents(platform: CalendarPlatforms, userId: string, account: string) {
  if (platform === CalendarPlatforms.GOOGLE) return getGoogleEvents(userId, account);
  if (platform === CalendarPlatforms.MICROSOFT) return getMicrosoftEvents(userId, account);
  return null;
}

async function getUserSyncedEvents(platform: CalendarPlatforms, userId: string) {
  const currentTime: Date = DateTime.now().toJSDate();
  return CronJobDataSource.manager.find(Notification, {
    where: { user_id: userId, event_begins: MoreThan(currentTime), platform },
  });
}

async function syncUserEvents(platform: CalendarPlatforms, userId: string, account: string) {
  const userSyncedEvents = await getUserSyncedEvents(platform, userId);
  const externalEventIds = userSyncedEvents.map((syncedEvent) => syncedEvent.external_id);
  const allUserEvents = await getAllUserEvents(platform, userId, account);
  const externalUserEventsIds = allUserEvents.map((userEvent) => userEvent.external_id);
  const eventsFromSyncedEvents = allUserEvents.filter((userEvent) => {
    const isEventFromSyncedEvents = externalEventIds.includes(userEvent?.external_id);
    if (isEventFromSyncedEvents) return true;
    return false;
  });

  const eventsToSync = allUserEvents.filter((userEvent) => {
    const isEventFromSyncedEvents = externalEventIds.includes(userEvent?.external_id);
    if (isEventFromSyncedEvents) return false;
    return true;
  });

  const eventsToRemoveIds = externalEventIds.filter((id) => {
    const isEventFromNewData = externalUserEventsIds.includes(id);
    if (isEventFromNewData) return false;
    return true;
  });

  await Promise.all(
    eventsFromSyncedEvents.map(async (syncedEvent) => {
      const updatedata = {
        summary: syncedEvent.summary,
        description: syncedEvent.description,
        event_begins: syncedEvent.event_begins,
        event_ends: syncedEvent.event_ends,
        external_metadata: syncedEvent.external_metadata,
      };
      await CronJobDataSource.manager.update(Notification, { external_id: syncedEvent.external_id }, updatedata);
    }),
  );

  const savedEvents = await CronJobDataSource.manager.save(Notification, eventsToSync);
  await CronJobDataSource.manager.delete(Notification, { external_id: In(eventsToRemoveIds) });

  return {
    eventsSaved: savedEvents.length,
    eventsRemoved: eventsToRemoveIds.length,
  };
}

async function getUsersToSyncWithPlatform(platform: CalendarPlatforms) {
  const IntegrationRecords = await CronJobDataSource.manager.find(PlatformIntegration, {
    where: { platform },
  });
  const recordsWithAccessAndRefreshTokens = IntegrationRecords.filter((integration) => {
    return integration.data.access_token; // && integration.data.refresh_token;
  });
  const idsOfUsersToSync = recordsWithAccessAndRefreshTokens.map((integrationRecord) => {
    return {
      id: integrationRecord.user_id,
      account: integrationRecord.external_user_id,
    };
  });
  return idsOfUsersToSync;
}

(async () => {
  try {
    await CronJobDataSource.initialize();
    const usersToSyncGoogle = await getUsersToSyncWithPlatform(CalendarPlatforms.GOOGLE);
    await Promise.all(usersToSyncGoogle.map((user) => syncUserEvents(CalendarPlatforms.GOOGLE, user.id, user.account)));

    const usersToSyncMicrosoft = await getUsersToSyncWithPlatform(CalendarPlatforms.MICROSOFT);
    await Promise.all(
      usersToSyncMicrosoft.map((user) => syncUserEvents(CalendarPlatforms.MICROSOFT, user.id, user.account)),
    );
    process.exit();
  } catch (error) {
    console.error(error);
  }
})();
