import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { UserRepository } from '../../user/repositories/user.repository';
import { UpdateCalendarEventDto } from '../dto/updateCalendarEvent.dto';
import { Notification } from '../entities/notification.entity';
import { NotificationRepository } from '../repository/notification.repository';

@Injectable()
export class NotificationService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly notificationRepository: NotificationRepository,
    @InjectSentry() private readonly sentryService: SentryService,
  ) {}

  async updateOrCreateCalendarEvent(
    event: UpdateCalendarEventDto,
    user_id: string,
    account: string,
  ): Promise<UpdateCalendarEventDto> {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Updating or creating calendar event',
        data: {
          user_id,
          event,
        },
      });
      const user = await this.userRepository.orm.findOneBy({ id: user_id });
      if (!user) throw new NotFoundException(`User with ID: ${user_id} does not exist!`);
      // eslint-disable-next-line prettier/prettier
      const {
        id,
        summary,
        description,
        event_begins,
        event_ends,
        external_id,
        is_dismissed,
        dismiss_reason,
        received,
        platform,
        calendar_id,
        external_metadata,
      } = event;
      const notification = await this.notificationRepository.orm.findOne({ where: [{ id }, { external_id }] });
      if (!notification) {
        const newNotification = new Notification({
          user_id,
          summary,
          description,
          external_id,
          event_begins,
          platform_account: account,
          event_ends,
          is_dismissed,
          dismiss_reason,
          received,
          platform,
          calendar_id,
          external_metadata,
        });
        await this.notificationRepository.create(newNotification);
        return newNotification;
      }
      // add update fields conditionally for PATCH request functionality
      await this.notificationRepository.update(notification.id, {
        ...(summary && { summary }),
        ...(description && { description }),
        ...(event_begins && { event_begins }),
        ...(event_ends && { event_ends }),
        ...(typeof is_dismissed === 'boolean' && { is_dismissed }),
        ...(dismiss_reason && { dismiss_reason }),
        ...(account && { platform_account: account }),
        ...(platform && { platform }),
        ...(calendar_id && { calendar_id }),
        ...(external_metadata && { external_metadata }),
        ...(external_id && { external_id }),
        ...(typeof received === 'boolean' && { received }),
      });
      return event;
    } catch (error) {
      this.sentryService.instance().captureException(JSON.stringify(error), { level: 'error' });
      throw error;
    }
  }

  async deleteCalendarEvent(externalId: string) {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Deleting calendar event',
        data: {
          external_id: externalId,
        },
      });
      await this.notificationRepository.orm.delete({ external_id: externalId });
    } catch (error) {
      this.sentryService.instance().captureException(JSON.stringify(error), { level: 'error' });
      throw error;
    }
  }
}
