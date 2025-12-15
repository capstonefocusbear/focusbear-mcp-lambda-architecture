import { Injectable } from '@nestjs/common';
import { InjectSentry, SentryService } from '@app/observability';
import { NotificationRepository } from '../../notification/repository/notification.repository';
import { Notification } from '../../notification/entities/notification.entity';
import { NotificationType } from '../../../shared/domain/notification-type.enum';
import { NotificationRelatedEntityType } from '../../../shared/domain/notification-related-entity-type.enum';

@Injectable()
export class AccountabilityNotificationService {
  constructor(
    private readonly notificationRepository: NotificationRepository,
    @InjectSentry() private readonly sentryService: SentryService,
  ) {}

  async createBuddyInvitationNotification(
    userId: string,
    accountabilityBuddyId: string,
    actionUrl: string,
    summary: string,
    description?: string,
  ): Promise<Notification> {
    try {
      const notification = new Notification({
        user_id: userId,
        notification_type: NotificationType.ACCOUNTABILITY_BUDDY_INVITATION,
        action_url: actionUrl,
        related_entity_id: accountabilityBuddyId,
        related_entity_type: NotificationRelatedEntityType.ACCOUNTABILITY_BUDDY,
        summary,
        description,
        received: false,
        is_dismissed: false,
      });
      return await this.notificationRepository.create(notification);
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async createInvitationAcceptedNotification(
    userId: string,
    accountabilityBuddyId: string,
    summary: string,
    description?: string,
  ): Promise<Notification> {
    try {
      const notification = new Notification({
        user_id: userId,
        notification_type: NotificationType.ACCOUNTABILITY_BUDDY_INVITATION_ACCEPTED,
        related_entity_id: accountabilityBuddyId,
        related_entity_type: NotificationRelatedEntityType.ACCOUNTABILITY_BUDDY,
        summary,
        description,
        received: false,
        is_dismissed: false,
      });
      return await this.notificationRepository.create(notification);
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async createUnlockRequestNotification(
    userId: string,
    unlockRequestId: string,
    actionUrl: string,
    summary: string,
    description?: string,
  ): Promise<Notification> {
    try {
      const notification = new Notification({
        user_id: userId,
        notification_type: NotificationType.UNLOCK_REQUEST_RECEIVED,
        action_url: actionUrl,
        related_entity_id: unlockRequestId,
        related_entity_type: NotificationRelatedEntityType.UNLOCK_REQUEST,
        summary,
        description,
        received: false,
        is_dismissed: false,
      });
      return await this.notificationRepository.create(notification);
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async createUnlockRequestApprovedNotification(
    userId: string,
    unlockRequestId: string,
    summary: string,
    description?: string,
  ): Promise<Notification> {
    try {
      const notification = new Notification({
        user_id: userId,
        notification_type: NotificationType.UNLOCK_REQUEST_APPROVED,
        related_entity_id: unlockRequestId,
        related_entity_type: NotificationRelatedEntityType.UNLOCK_REQUEST,
        summary,
        description,
        received: false,
        is_dismissed: false,
      });
      return await this.notificationRepository.create(notification);
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async createUnlockRequestRejectedNotification(
    userId: string,
    unlockRequestId: string,
    summary: string,
    description?: string,
  ): Promise<Notification> {
    try {
      const notification = new Notification({
        user_id: userId,
        notification_type: NotificationType.UNLOCK_REQUEST_REJECTED,
        related_entity_id: unlockRequestId,
        related_entity_type: NotificationRelatedEntityType.UNLOCK_REQUEST,
        summary,
        description,
        received: false,
        is_dismissed: false,
      });
      return await this.notificationRepository.create(notification);
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }
}
