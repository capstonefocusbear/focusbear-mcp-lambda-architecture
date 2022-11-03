import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  createCalendarEventDummy,
  notificationDBResponseDummy,
  updateCalendarEventDummy,
  userDummy,
} from '../../../../test/dummies ';
import { NotificationRepositoryMock, UserRepositoryMock } from '../../../../test/mocks';
import { UserRepository } from '../../user/repositories/user.repository';
import { NotificationRepository } from '../repository/notification.repository';
import { NotificationService } from './notification.service';
import { Notification } from '../entities/notification.entity';

describe('NotificationService', () => {
  let notificationService: NotificationService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [NotificationService, NotificationRepository, UserRepository],
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
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(null);
      const errorMessage = `User with ID: ${userDummy.id} does not exist!`;
      let exception: any;
      try {
        await notificationService.updateOrCreateCalendarEvent(updateCalendarEventDummy, userDummy.id);
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('positive: should call create on NotificationRepository', async () => {
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(userDummy);
      NotificationRepositoryMock.orm.findOne.mockResolvedValueOnce(null);

      const newNotification = new Notification({
        user_id: userDummy.id,
        summary: createCalendarEventDummy.summary,
        description: createCalendarEventDummy.description,
        external_id: createCalendarEventDummy.external_id,
        event_begins: createCalendarEventDummy.event_begins,
        event_ends: createCalendarEventDummy.event_ends,
        is_dismissed: createCalendarEventDummy.is_dismissed,
        dismiss_reason: createCalendarEventDummy.dismiss_reason,
        received: createCalendarEventDummy.received,
      });

      await notificationService.updateOrCreateCalendarEvent(createCalendarEventDummy, userDummy.id);

      expect(NotificationRepositoryMock.create).toBeCalledWith(newNotification);
    });

    it('positive: should call update on NotificationRepository', async () => {
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(userDummy);
      NotificationRepositoryMock.orm.findOne.mockResolvedValueOnce(notificationDBResponseDummy);

      const updatedNotification = {
        summary: updateCalendarEventDummy.summary,
        description: updateCalendarEventDummy.description,
        external_id: updateCalendarEventDummy.external_id,
        event_begins: updateCalendarEventDummy.event_begins,
        event_ends: updateCalendarEventDummy.event_ends,
        is_dismissed: updateCalendarEventDummy.is_dismissed,
        dismiss_reason: updateCalendarEventDummy.dismiss_reason,
        received: updateCalendarEventDummy.received,
      };

      await notificationService.updateOrCreateCalendarEvent(updateCalendarEventDummy, userDummy.id);

      expect(NotificationRepositoryMock.update).toBeCalledWith(updateCalendarEventDummy.id, updatedNotification);
    });
  });
});
