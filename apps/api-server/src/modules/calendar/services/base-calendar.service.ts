import { MoreThan } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { DateTime } from 'luxon';
import { ICalendarService } from './calendar.service.interface';
import { PlatformIntegrationsService } from '../../platform-integrations/services/platform-integrations.service';
import { NotificationService } from '../../notification/services/notification.service';
import { NotificationRepository } from '../../notification/repository/notification.repository';
import { IntegrationPlatforms } from '../../platform-integrations/domain/integration-platforms.enum';
import { UserRepository } from '../../user/repositories/user.repository';

export abstract class BaseCalendarService implements ICalendarService {
  constructor(
    protected readonly notificationRepository: NotificationRepository,
    protected readonly notificationService: NotificationService,
    protected readonly platformIntegrationService: PlatformIntegrationsService,
    protected readonly userRepository: UserRepository,
  ) {}

  async updateEvents(userId: string, account: string) {
    const user = await this.userRepository.orm.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException(`User with ID: ${userId} does not exist!`);
    }

    const events = await this.getEvents(userId, account);
    const eventIds = events.map((calEvent) => {
      return calEvent.external_id;
    });
    const eventsInDb = await this.notificationRepository.orm.find({
      where: { user_id: userId, event_begins: MoreThan(DateTime.local().toJSDate()) },
    });
    const eventIdsInDb = await eventsInDb.map((eventInDb) => {
      return eventInDb.external_id;
    });

    eventIdsInDb.forEach((eventId) => {
      if (!eventIds.includes(eventId)) this.notificationService.deleteCalendarEvent(eventId);
    });

    events.forEach((calendarEvent) => {
      this.notificationService.updateOrCreateCalendarEvent(calendarEvent, userId);
    });

    return events;
  }

  async getEvents(userId: string, account: string) {
    // for avoiding an eslint error
    const data = { userId, account };
    if (data) {
      return [];
    }
    return [];
  }

  async getAccounts(platform: IntegrationPlatforms, userId: string) {
    return this.platformIntegrationService.getPlatformAccounts(platform, userId);
  }
}
