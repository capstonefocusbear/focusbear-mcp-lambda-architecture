import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { calendar_v3, google } from 'googleapis';
import { PlatformIntegrationsService } from '../../platform-integrations/services/platform-integrations.service';
import { IntegrationPlatforms } from '../../platform-integrations/domain/integration-platforms.enum';
import { Notification } from '../../notification/entities/notification.entity';
import { CalendarPlatforms } from '../../platform-integrations/domain/calendar-platforms.enum';
import { BaseCalendarService } from './base-calendar.service';
import { NotificationService } from '../../notification/services/notification.service';
import { NotificationRepository } from '../../notification/repository/notification.repository';

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
export class GoogleCalendarService extends BaseCalendarService {
  constructor(
    protected readonly configService: ConfigService,
    protected readonly platformIntegrationService: PlatformIntegrationsService,
    protected readonly notificationRepository: NotificationRepository,
    protected readonly notificationService: NotificationService,
  ) {
    super(notificationRepository, notificationService, platformIntegrationService);
  }

  async getEvents(userId) {
    const platform = IntegrationPlatforms.GOOGLE;
    const googleIntegrationRecord = await this.platformIntegrationService.getPlatformIntegrationData(platform, userId);
    const clientId = this.configService.get(`${platform.toUpperCase}_CLIENT_ID`);
    const clientSecret = this.configService.get(`${platform.toUpperCase()}_CLIENT_SECRET`);
    const callbackUrl = this.configService.get(`${platform.toUpperCase()}_CALLBACK_URL`);

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, callbackUrl);
    oauth2Client.setCredentials(googleIntegrationRecord.data);

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
