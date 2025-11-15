import { Test } from '@nestjs/testing';
import { SENTRY_TOKEN } from '@ntegral/nestjs-sentry';
import { AccountabilityNotificationService } from './accountability-notification.service';
import { NotificationRepository } from '../../notification/repository/notification.repository';
import { Notification } from '../../notification/entities/notification.entity';
import { NotificationType } from '../../../shared/domain/notification-type.enum';
import { NotificationRelatedEntityType } from '../../../shared/domain/notification-related-entity-type.enum';
import { NotificationRepositoryMock, SentryServiceMock } from '../../../../test/mocks';

describe('AccountabilityNotificationService', () => {
  let service: AccountabilityNotificationService;

  const userId = 'user-id-123';
  const accountabilityBuddyId = 'accountability-buddy-id-123';
  const unlockRequestId = 'unlock-request-id-123';
  const actionUrl = 'https://app.example.com/accountability-buddy/accept?token=abc123';
  const summary = 'Test summary';
  const description = 'Test description';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        AccountabilityNotificationService,
        NotificationRepository,
        {
          provide: SENTRY_TOKEN,
          useValue: SentryServiceMock,
        },
      ],
    })
      .overrideProvider(NotificationRepository)
      .useValue(NotificationRepositoryMock)
      .compile();

    service = moduleRef.get<AccountabilityNotificationService>(AccountabilityNotificationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createBuddyInvitationNotification', () => {
    it('should create buddy invitation notification with description', async () => {
      const mockNotification = new Notification({
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

      NotificationRepositoryMock.create.mockResolvedValueOnce(mockNotification);

      const result = await service.createBuddyInvitationNotification(
        userId,
        accountabilityBuddyId,
        actionUrl,
        summary,
        description,
      );

      expect(result).toEqual(mockNotification);
      expect(NotificationRepositoryMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: userId,
          notification_type: NotificationType.ACCOUNTABILITY_BUDDY_INVITATION,
          action_url: actionUrl,
          related_entity_id: accountabilityBuddyId,
          related_entity_type: NotificationRelatedEntityType.ACCOUNTABILITY_BUDDY,
          summary,
          description,
          received: false,
          is_dismissed: false,
        }),
      );
    });

    it('should create buddy invitation notification without description', async () => {
      const mockNotification = new Notification({
        user_id: userId,
        notification_type: NotificationType.ACCOUNTABILITY_BUDDY_INVITATION,
        action_url: actionUrl,
        related_entity_id: accountabilityBuddyId,
        related_entity_type: NotificationRelatedEntityType.ACCOUNTABILITY_BUDDY,
        summary,
        received: false,
        is_dismissed: false,
      });

      NotificationRepositoryMock.create.mockResolvedValueOnce(mockNotification);

      const result = await service.createBuddyInvitationNotification(userId, accountabilityBuddyId, actionUrl, summary);

      expect(result).toEqual(mockNotification);
    });
  });

  describe('createInvitationAcceptedNotification', () => {
    it('should create invitation accepted notification', async () => {
      const mockNotification = new Notification({
        user_id: userId,
        notification_type: NotificationType.ACCOUNTABILITY_BUDDY_INVITATION_ACCEPTED,
        related_entity_id: accountabilityBuddyId,
        related_entity_type: NotificationRelatedEntityType.ACCOUNTABILITY_BUDDY,
        summary,
        description,
        received: false,
        is_dismissed: false,
      });

      NotificationRepositoryMock.create.mockResolvedValueOnce(mockNotification);

      const result = await service.createInvitationAcceptedNotification(
        userId,
        accountabilityBuddyId,
        summary,
        description,
      );

      expect(result).toEqual(mockNotification);
      expect(NotificationRepositoryMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: userId,
          notification_type: NotificationType.ACCOUNTABILITY_BUDDY_INVITATION_ACCEPTED,
          related_entity_id: accountabilityBuddyId,
          related_entity_type: NotificationRelatedEntityType.ACCOUNTABILITY_BUDDY,
          summary,
          description,
        }),
      );
    });
  });

  describe('createUnlockRequestNotification', () => {
    it('should create unlock request notification', async () => {
      const mockNotification = new Notification({
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

      NotificationRepositoryMock.create.mockResolvedValueOnce(mockNotification);

      const result = await service.createUnlockRequestNotification(
        userId,
        unlockRequestId,
        actionUrl,
        summary,
        description,
      );

      expect(result).toEqual(mockNotification);
      expect(NotificationRepositoryMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: userId,
          notification_type: NotificationType.UNLOCK_REQUEST_RECEIVED,
          action_url: actionUrl,
          related_entity_id: unlockRequestId,
          related_entity_type: NotificationRelatedEntityType.UNLOCK_REQUEST,
          summary,
          description,
        }),
      );
    });
  });

  describe('createUnlockRequestApprovedNotification', () => {
    it('should create unlock request approved notification', async () => {
      const mockNotification = new Notification({
        user_id: userId,
        notification_type: NotificationType.UNLOCK_REQUEST_APPROVED,
        related_entity_id: unlockRequestId,
        related_entity_type: NotificationRelatedEntityType.UNLOCK_REQUEST,
        summary,
        description,
        received: false,
        is_dismissed: false,
      });

      NotificationRepositoryMock.create.mockResolvedValueOnce(mockNotification);

      const result = await service.createUnlockRequestApprovedNotification(
        userId,
        unlockRequestId,
        summary,
        description,
      );

      expect(result).toEqual(mockNotification);
      expect(NotificationRepositoryMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: userId,
          notification_type: NotificationType.UNLOCK_REQUEST_APPROVED,
          related_entity_id: unlockRequestId,
          related_entity_type: NotificationRelatedEntityType.UNLOCK_REQUEST,
          summary,
          description,
        }),
      );
    });
  });

  describe('createUnlockRequestRejectedNotification', () => {
    it('should create unlock request rejected notification', async () => {
      const mockNotification = new Notification({
        user_id: userId,
        notification_type: NotificationType.UNLOCK_REQUEST_REJECTED,
        related_entity_id: unlockRequestId,
        related_entity_type: NotificationRelatedEntityType.UNLOCK_REQUEST,
        summary,
        description,
        received: false,
        is_dismissed: false,
      });

      NotificationRepositoryMock.create.mockResolvedValueOnce(mockNotification);

      const result = await service.createUnlockRequestRejectedNotification(
        userId,
        unlockRequestId,
        summary,
        description,
      );

      expect(result).toEqual(mockNotification);
      expect(NotificationRepositoryMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: userId,
          notification_type: NotificationType.UNLOCK_REQUEST_REJECTED,
          related_entity_id: unlockRequestId,
          related_entity_type: NotificationRelatedEntityType.UNLOCK_REQUEST,
          summary,
          description,
        }),
      );
    });
  });
});
