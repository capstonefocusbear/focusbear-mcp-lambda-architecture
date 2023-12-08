import { MoreThan } from 'typeorm';
import { DateTime } from 'luxon';
import { ICalendarService } from './calendar.service.interface';
import { PlatformIntegrationsService } from '../../platform-integrations/services/platform-integrations.service';
import { NotificationService } from '../../notification/services/notification.service';
import { NotificationRepository } from '../../notification/repository/notification.repository';
import { IntegrationPlatforms } from '../../platform-integrations/domain/integration-platforms.enum';

export abstract class BaseCalendarService implements ICalendarService {
  constructor(
    protected readonly notificationRepository: NotificationRepository,
    protected readonly notificationService: NotificationService,
    protected readonly platformIntegrationService: PlatformIntegrationsService,
  ) {}

  async updateEvents(userId) {
    const events = await this.getEvents(userId);
    const eventIds = events.map((calEvent) => {
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

  async getEvents(userId: any) {
    return [userId];
  }

  async getAccounts(platform: IntegrationPlatforms, userId: string) {
    return this.platformIntegrationService.getPlatformAccounts(platform, userId);
  }
}
