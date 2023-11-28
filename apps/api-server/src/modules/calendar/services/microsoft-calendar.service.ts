import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { MoreThan } from 'typeorm';
import { DateTime } from 'luxon';
import { PlatformIntegrationsService } from '../../platform-integrations/services/platform-integrations.service';
import { IntegrationPlatforms } from '../../platform-integrations/domain/integration-platforms.enum';
import { Notification } from '../../notification/entities/notification.entity';
import { CalendarPlatforms } from '../../platform-integrations/domain/calendar-platforms.enum';
import { MicrosoftCalendarEventDto } from '../dto/microsoft-calendar-event.dto';
import { NotificationRepository } from '../../notification/repository/notification.repository';
import { NotificationService } from '../../notification/services/notification.service';

const notificationAdapter = ({
  event,
  userId,
  calendarId,
}: {
  event: MicrosoftCalendarEventDto;
  userId: string;
  calendarId: string;
}) => {
  const { id, subject, bodyPreview, start, end, isAllDay } = event;
  const { dateTime: event_begins } = start;
  const { dateTime: event_ends } = end;
  if (isAllDay) return;

  return new Notification({
    user_id: userId,
    platform: CalendarPlatforms.MICROSOFT,
    calendar_id: calendarId,
    external_id: id,
    summary: subject,
    description: bodyPreview,
    event_begins: new Date(event_begins),
    event_ends: new Date(event_ends),
    external_metadata: event,
  });
};

@Injectable()
export class MicrosoftCalendarService {
  protected readonly tenantId;

  protected readonly clientId;

  protected readonly clientSecret;

  protected readonly callbackUrl;

  protected readonly scopes = ['https://graph.microsoft.com/Calendars.Read'];

  private readonly baseUrl = 'https://graph.microsoft.com/v1.0';

  constructor(
    protected readonly configService: ConfigService,
    private readonly platformIntegrationService: PlatformIntegrationsService,
    private readonly notificationRepository: NotificationRepository,
    private readonly notificationService: NotificationService,
  ) {
    this.tenantId = configService.get('MICROSOFT_TENANT_ID');
    this.clientId = configService.get('MICROSOFT_CLIENT_ID');
    this.clientSecret = configService.get('MICROSOFT_CLIENT_SECRET');
    this.callbackUrl = configService.get('MICROSOFT_CALLBACK_URL');
  }

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
    const platform = IntegrationPlatforms.MICROSOFT;
    const record = await this.platformIntegrationService.getPlatformIntegrationData(platform, userId);

    const headers = {
      Authorization: `Bearer ${record.data.access_token}`,
    };

    const { data: calendarData } = await axios.get(`${this.baseUrl}/me/calendars`, { headers });
    const { value: calendarList } = calendarData;
    const calendarIds = calendarList.map((calendar) => calendar.id);

    const events = await Promise.all(
      calendarIds.map(async (calendarId) => this.getEvent({ userId, calendarId, headers })),
    );

    return events.flat().filter((event) => !!event);
  }

  private async getEvent({ userId, calendarId, headers }: { userId: string; calendarId: string; headers: any }) {
    const { data: eventData } = await axios.get(`${this.baseUrl}/me/calendars/${calendarId}/events`, {
      headers,
      params: {
        $filter: `start/dateTime ge '${new Date().toISOString()}'`,
        $orderby: 'start/dateTime',
      },
    });
    const { value: eventList } = eventData;
    return eventList.map((event) => notificationAdapter({ event, calendarId, userId }));
  }
}
