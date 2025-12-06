import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { SENTRY_TOKEN } from '@app/observability';
import {
  createCalendarEventDummy,
  notificationDBResponseDummy,
  updateCalendarEventDummy,
  userDummy,
} from '../../../../test/dummies';
import { NotificationRepositoryMock, SentryServiceMock, UserRepositoryMock } from '../../../../test/mocks';
import { UserRepository } from '../../user/repositories/user.repository';
import { NotificationRepository } from '../repository/notification.repository';
import { NotificationService } from './notification.service';
import { Notification } from '../entities/notification.entity';

describe('NotificationService', () => {
  let notificationService: NotificationService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        NotificationService,
        NotificationRepository,
        UserRepository,
        {
          provide: SENTRY_TOKEN,
          useValue: SentryServiceMock,
        },
      ],
    })
      .overrideProvider(NotificationRepository)
      .useValue(NotificationRepositoryMock)
      .overrideProvider(UserRepository)
      .useValue(UserRepositoryMock)
      .compile();

    notificationService = moduleRef.get<NotificationService>(NotificationService);
  });

  it('should be defined', () => {
    expect(notificationService).toBeDefined();
  });

  describe('updateOrCreateCalendarEvent', () => {
    it('negative: should return that the user was not found', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(null);
      const errorMessage = `User with ID: ${userDummy.id} does not exist!`;
      const account = 'account';
      let exception: any;
      try {
        await notificationService.updateOrCreateCalendarEvent(updateCalendarEventDummy, userDummy.id, account);
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('positive: should call create on NotificationRepository', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      NotificationRepositoryMock.orm.findOne.mockResolvedValueOnce(null);
      const account = 'account';
      const newNotification = new Notification({
        user_id: userDummy.id,
        summary: createCalendarEventDummy.summary,
        description: createCalendarEventDummy.description,
        external_id: createCalendarEventDummy.external_id,
        event_begins: createCalendarEventDummy.event_begins,
        event_ends: createCalendarEventDummy.event_ends,
        is_dismissed: createCalendarEventDummy.is_dismissed,
        dismiss_reason: createCalendarEventDummy.dismiss_reason,
        calendar_id: undefined,
        platform_account: account,
        platform: undefined,
        external_metadata: undefined,
        received: createCalendarEventDummy.received,
      });

      await notificationService.updateOrCreateCalendarEvent(createCalendarEventDummy, userDummy.id, account);

      expect(NotificationRepositoryMock.create).toHaveBeenCalledWith(newNotification);
    });

    it('positive: should call update on NotificationRepository', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      NotificationRepositoryMock.orm.findOne.mockResolvedValueOnce(notificationDBResponseDummy);
      const account = 'account';
      const updatedNotification = {
        summary: updateCalendarEventDummy.summary,
        description: updateCalendarEventDummy.description,
        external_id: updateCalendarEventDummy.external_id,
        event_begins: updateCalendarEventDummy.event_begins,
        event_ends: updateCalendarEventDummy.event_ends,
        is_dismissed: updateCalendarEventDummy.is_dismissed,
        dismiss_reason: updateCalendarEventDummy.dismiss_reason,
        platform_account: account,
        received: updateCalendarEventDummy.received,
      };

      await notificationService.updateOrCreateCalendarEvent(updateCalendarEventDummy, userDummy.id, account);

      expect(NotificationRepositoryMock.update).toHaveBeenCalledWith(updateCalendarEventDummy.id, updatedNotification);
    });
  });

  describe('deleteCalendarEvent', () => {
    it('positive: should delete notification', async () => {
      await notificationService.deleteCalendarEvent(notificationDBResponseDummy.external_id);
      expect(NotificationRepositoryMock.orm.delete).toHaveBeenCalledWith({
        external_id: notificationDBResponseDummy.external_id,
      });
    });
  });
});
