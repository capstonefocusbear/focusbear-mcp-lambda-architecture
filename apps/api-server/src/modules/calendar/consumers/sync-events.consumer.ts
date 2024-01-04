import { Process, Processor } from '@nestjs/bull';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { Job } from 'bull';
import { In, MoreThan } from 'typeorm';
import { DateTime } from 'luxon';
import axios from 'axios';
import { calendar_v3, google as Google } from 'googleapis';
import { ConfigService } from '@nestjs/config';
import { BullQueues, BullWorkers } from '../../../shared/utils/constants';
import { NotificationRepository } from '../../notification/repository/notification.repository';
import { CalendarPlatforms } from '../../platform-integrations/domain/calendar-platforms.enum';
import { CalendarRepository } from '../repositories/calendar.repository';
import { PlatformIntegrationRepository } from '../../platform-integrations/repositories/platform-integration.repository';
import { MicrosoftCalendarEventDto } from '../dto/microsoft-calendar-event.dto';
import { Notification } from '../../notification/entities/notification.entity';

@Processor(BullQueues.SYNC_EVENTS)
export class SyncEventsConsumer {
  constructor(
    @InjectSentry() private readonly sentryService: SentryService,
    private readonly notificationRepository: NotificationRepository,
    private readonly calendarRepository: CalendarRepository,
    private readonly platformIntegrationRepository: PlatformIntegrationRepository,
    protected readonly configService: ConfigService,
  ) {}

  async getUserSyncedEvents(platform: CalendarPlatforms, userId: string) {
    const currentTime: Date = DateTime.now().toJSDate();
    return this.notificationRepository.orm.find({
      where: { user_id: userId, event_begins: MoreThan(currentTime), platform },
    });
  }

  async getAllUserEvents(platform: CalendarPlatforms, userId: string, account: string) {
    if (platform === CalendarPlatforms.GOOGLE) return this.getGoogleEvents(userId, account);
    if (platform === CalendarPlatforms.MICROSOFT) return this.getMicrosoftEvents(userId, account);
    return null;
  }

  async getGoogleEvents(userId: string, account: string) {
    const platform = CalendarPlatforms.GOOGLE;
    // get platform integration data according to userId and accountId.
    const record = await this.platformIntegrationRepository.orm.findOne({
      where: { user_id: userId, platform, external_user_id: account },
    });
    const clientId = this.configService.get('GOOGLE_CLIENT_ID');
    const clientSecret = this.configService.get('GOOGLE_CLIENT_SECRET');
    const callbackUrl = this.configService.get('GOOGLE_CALLBACK_URL');

    const oauth2Client = new Google.auth.OAuth2(clientId, clientSecret, callbackUrl);
    oauth2Client.setCredentials(record.data);
    // Refresh access token using refresh token already provided
    if (record.data.expiry_date < DateTime.local().toMillis() + 1000) {
      return [];
    }

    const calendar = Google.calendar({ version: 'v3', auth: oauth2Client });
    const { data: googleCalendars } = await calendar.calendarList.list();
    const { items: calendarList } = googleCalendars;
    const calendarsFromGoogleIds: string[] = calendarList.map((googleCalendar) => googleCalendar.id);
    const syncedGoogleCalendars = await this.calendarRepository.orm.find({
      where: { calendar_id: In(calendarsFromGoogleIds), user_id: userId, platform, is_selected: true },
    });
    const syncedGoogleCalendarIds = syncedGoogleCalendars.map((syncedCalendar) => syncedCalendar.calendar_id);

    // fetch events from only selected calendars
    const events = await Promise.all(
      calendarsFromGoogleIds
        .filter((calendarId) => syncedGoogleCalendarIds.includes(calendarId))
        .map(async (calendarId) => this.getGoogleEvent({ userId, calendarId, calendar })),
    );

    return events.flat().filter((event) => !!event);
  }

  async getMicrosoftEvents(userId: string, accountId: string) {
    const platform = CalendarPlatforms.MICROSOFT;
    // get platform integration data accoding to userId and accountId.
    const record = await this.platformIntegrationRepository.orm.findOne({
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
    const syncedMicrosoftCalendars = await this.calendarRepository.orm.find({
      where: { calendar_id: In(calendarsFromMicroSoftIds), user_id: userId, platform, is_selected: true },
    });
    const syncedMicrosoftCalendarIds = syncedMicrosoftCalendars.map(
      (microsoftCalendar) => microsoftCalendar.calendar_id,
    );
    // fetch events from only selected calendars
    const events = await Promise.all(
      calendarsFromMicroSoftIds
        .filter((calenarId) => syncedMicrosoftCalendarIds.includes(calenarId))
        .map(async (calendarId) => this.getMicrosoftEvent({ userId, calendarId, headers, accountId })),
    );

    return events.flat().filter((event) => !!event);
  }

  async getGoogleEvent({
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

    return data.items.map((event) => this.notificationGoogleAdapter({ event, userId, calendarId }));
  }

  async getMicrosoftEvent({
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
    return eventList.map((event) => this.notificationMicrosoftAdapter({ event, calendarId, userId, accountId }));
  }

  notificationGoogleAdapter({
    event,
    userId,
    calendarId,
  }: {
    event: calendar_v3.Schema$Event;
    userId: string;
    calendarId: string;
  }) {
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
  }

  notificationMicrosoftAdapter({
    event,
    userId,
    calendarId,
    accountId,
  }: {
    event: MicrosoftCalendarEventDto;
    userId: string;
    calendarId: string;
    accountId: string;
  }) {
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
  }

  @Process(BullWorkers.SYNC_EVENTS_FOR_PLATFORM)
  async readOperationJob(job: Job<{ platform: CalendarPlatforms; userId: string; account: string }>) {
    const {
      data: { platform, userId, account },
    } = job;
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Syncing calendar events',
        data: {
          platform,
          userId,
        },
      });
      const userSyncedEvents = await this.getUserSyncedEvents(platform, userId);
      const externalEventIds = userSyncedEvents.map((syncedEvent) => syncedEvent.external_id);
      const allUserEvents = await this.getAllUserEvents(platform, userId, account);
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
          const updateData = {
            summary: syncedEvent.summary,
            description: syncedEvent.description,
            event_begins: syncedEvent.event_begins,
            event_ends: syncedEvent.event_ends,
            external_metadata: syncedEvent.external_metadata,
          };
          await this.notificationRepository.orm.update({ external_id: syncedEvent.external_id }, updateData);
        }),
      );

      await this.notificationRepository.orm.save(eventsToSync);
      await this.notificationRepository.orm.delete({ external_id: In(eventsToRemoveIds) });
    } catch (error) {
      this.sentryService.instance().captureException(JSON.stringify(error), { level: 'error' });
      console.error('Error in sync-events-for-platform queued job: ', JSON.stringify(error));
    }
  }
}
