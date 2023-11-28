import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { calendar_v3, google } from 'googleapis';
import { MoreThan } from 'typeorm';
import { DateTime } from 'luxon';
import { PlatformIntegrationsService } from '../../platform-integrations/services/platform-integrations.service';
import { IntegrationPlatforms } from '../../platform-integrations/domain/integration-platforms.enum';
import { NotificationRepository } from '../../notification/repository/notification.repository';
import { Notification } from '../../notification/entities/notification.entity';
import { CalendarPlatforms } from '../../platform-integrations/domain/calendar-platforms.enum';
import { NotificationService } from '../../notification/services/notification.service';

const notificationAdapter = ({
  event,
  userId,
  calendarId,
}: {
  event: calendar_v3.Schema$Event;
  userId: string;
  calendarId: string;
}) => {
  const { id, summary, description, start, end } = event;
  const { date, dateTime: event_begins } = start;
  const { dateTime: event_ends } = end;
  if (date) {
    return;
  }
  return new Notification({
    user_id: userId,
    platform: CalendarPlatforms.GOOGLE,
    calendar_id: calendarId,
    external_id: id,
    summary,
    description,
    event_begins: new Date(event_begins),
    event_ends: new Date(event_ends),
    external_metadata: event,
  });
};

@Injectable()
export class GoogleCalendarService {
  constructor(
    protected readonly configService: ConfigService,
    private readonly platformIntegrationService: PlatformIntegrationsService,
    private readonly notificationRepository: NotificationRepository,
    private readonly notificationService: NotificationService,
  ) {}

  async updateEvents(userId) {
    const events = await this.getEvents(userId);
    const eventIds = await events.map((calEvent) => {
      return calEvent.external_id;
    });
    const eventsInDb = await this.notificationRepository.orm.find({
      where: { user_id: userId, event_begins: MoreThan(DateTime.local().toJSDate()) },
    });
    const eventIdsInDb = await eventsInDb.map((eventInDb) => {
      return eventInDb.external_id;
    });

    await eventIdsInDb.map((eventId) => {
      if (!eventIds.includes(eventId)) this.notificationService.deleteCalendarEvent(eventId);
      return true;
    });

    await events.map((calendarEvent) => {
      this.notificationService.updateOrCreateCalendarEvent(calendarEvent, userId);
      return true;
    });

    return events;
  }

  async getEvents(userId) {
    const platform = IntegrationPlatforms.GOOGLE;
    const record = await this.platformIntegrationService.getPlatformIntegrationData(platform, userId);
    const clientId = this.configService.get(`${platform.toUpperCase}_CLIENT_ID`);
    const clientSecret = this.configService.get(`${platform.toUpperCase()}_CLIENT_SECRET`);
    const callbackUrl = this.configService.get(`${platform.toUpperCase()}_CALLBACK_URL`);

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, callbackUrl);
    oauth2Client.setCredentials(record.data);

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const { data: calendarList } = await calendar.calendarList.list();
    const calendarIds = calendarList.items.map((item) => item.id);
    const events = await Promise.all(
      calendarIds.map(async (calendarId) => this.getEvent({ userId, calendarId, calendar })),
    );

    return events.flat().filter((event) => !!event);
  }

  private async getEvent({
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

    return data.items.map((event) => notificationAdapter({ event, userId, calendarId }));
  }
}
