import { Test } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { SENTRY_TOKEN } from '@ntegral/nestjs-sentry';
import { randomUUID } from 'crypto';
import { StripeService } from '@app/stripe';
import { QueueMock, userDummy, userSettingsDBResponseDummy } from '../../../../../test/dummies';
import { ActivityService } from './activity.service';
import { UserRepository } from '../../../user/repositories/user.repository';
import {
  ActivityRepositoryMock,
  SentryServiceMock,
  StripeServiceMock,
  UserConsentRepositoryMock,
  UserRepositoryMock,
} from '../../../../../test/mocks/index';
import { ActivityRepository } from '../../repositories/activity.repository';
import { ActivityType } from '../../domain/activity-type.enum';
import { UserTypes } from '../../../user/domain/user-types.enum';
import { BullQueues, BullWorkers } from '../../../../shared/utils/constants';

describe('ActivityService', () => {
  let activityService: ActivityService;
  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        ActivityService,
        ActivityRepository,
        UserRepository,
        StripeService,
        {
          provide: getQueueToken(BullQueues.ACTIVITY_IMAGE),
          useValue: QueueMock,
        },
        {
          provide: SENTRY_TOKEN,
          useValue: SentryServiceMock,
        },
      ],
    })
      .overrideProvider(UserRepository)
      .useValue(UserRepositoryMock)
      .overrideProvider(ActivityRepository)
      .useValue(ActivityRepositoryMock)
      .overrideProvider(StripeService)
      .useValue(StripeServiceMock)
      .compile();

    activityService = moduleRef.get<ActivityService>(ActivityService);
  });

  it('should be defined', () => {
    expect(activityService).toBeDefined();
  });

  describe('deleteActivityImageFromUploadIO', () => {
    it('negative: should return a not found exception if user is not found in DB', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(null);
      const errorMessage = `User with ID: ${userDummy.id} does not exist!`;
      let exception: any;

      try {
        await activityService.deleteActivityImageFromUploadIO(userDummy.id, '/dummy/file/path');
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('negative: should return an unauthorized exception if user is not creator of activity incoming image is from', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      ActivityRepositoryMock.orm.findOneBy.mockResolvedValueOnce({ user_id: randomUUID() });
      const wrongActivityId = '3c07fd91-adf4-4ec1-bcef-3818842e9a7a';
      const errorMessage = `User with ID: ${userDummy.id} is not authorized to delete this image from activity with ID: ${wrongActivityId}`;
      let exception: any;

      try {
        await activityService.deleteActivityImageFromUploadIO(
          userDummy.id,
          `/uploads/activity_images/${wrongActivityId}/quantum_awareness_icon.png`,
        );
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(UnauthorizedException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('positive: should add the incoming image path to the queue to delete the image on upload.io', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      ActivityRepositoryMock.orm.findOneBy.mockResolvedValueOnce({ user_id: userDummy.id });
      const activityId = '3c07fd91-adf4-4ec1-bcef-3818842e9a7a';

      await activityService.deleteActivityImageFromUploadIO(
        userDummy.id,
        `/uploads/activity_images/${activityId}/quantum_awareness_icon.png`,
      );

      expect(QueueMock.add).toBeCalledWith(BullWorkers.DELETE_ACTIVITY_IMAGE, {
        user_id: userDummy.id,
        filePath: `/uploads/activity_images/${activityId}/quantum_awareness_icon.png`,
      });
    });
  });

  describe('getUserActivitiesForAdmin', () => {
    it('negative: should throw error if non-admin user tries to access other users activities', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce({ ...userDummy, user_type: UserTypes.STANDARD });
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(userDummy);
      ActivityRepositoryMock.getActivitiesForAdmin.mockResolvedValueOnce(
        userSettingsDBResponseDummy.activity_sequences[0].activities,
      );
      let exception;
      const errorMessage = `User with ID: ${userDummy.id} is not authorized to access this endpoint!`;

      try {
        await activityService.getUserActivitiesForAdmin(userDummy.id, {
          user_id: userDummy.id,
          page_num: 2,
          activity_type: ActivityType.morning,
        });
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeInstanceOf(UnauthorizedException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('positive: should return users activities for admin', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce({ ...userDummy, user_type: UserTypes.ADMIN });
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(userDummy);
      ActivityRepositoryMock.getActivitiesForAdmin.mockResolvedValueOnce(
        userSettingsDBResponseDummy.activity_sequences[0].activities,
      );

      await activityService.getUserActivitiesForAdmin(userDummy.id, {
        user_id: userDummy.id,
        page_num: 2,
        activity_type: ActivityType.morning,
      });

      expect(ActivityRepositoryMock.getActivitiesForAdmin).toBeCalledWith(userDummy.id, 2, ActivityType.morning);
    });

    it("positive: if activities are searched using user's email, stripe ID should be fetched first from Stripe and that should be used to query user's activities", async () => {
      const dummyEmail = 'test@email.com';
      const dummyStripeId = 'cus_xxx';
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce({ ...userDummy, user_type: UserTypes.ADMIN });
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(userDummy);
      ActivityRepositoryMock.getActivitiesForAdmin.mockResolvedValueOnce(
        userSettingsDBResponseDummy.activity_sequences[0].activities,
      );
      StripeServiceMock.getStripeCustomerId.mockResolvedValueOnce(dummyStripeId);

      await activityService.getUserActivitiesForAdmin(userDummy.id, {
        email: dummyEmail,
        page_num: 1,
      });

      expect(StripeServiceMock.getStripeCustomerId).toBeCalledWith(dummyEmail);
      expect(UserConsentRepositoryMock.orm.findOne).toBeCalledWith({
        where: [{ id: undefined }, { stripe_customer_id: dummyStripeId }],
      });
      expect(ActivityRepositoryMock.getActivitiesForAdmin).toBeCalledWith(userDummy.id, 2, ActivityType.morning);
    });

    it("positive: if activities are searched using user's email and no matching user is found in Stripe, empty array of activities should be returned", async () => {
      const dummyEmail = 'test@email.com';
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce({ ...userDummy, user_type: UserTypes.ADMIN });
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(userDummy);
      ActivityRepositoryMock.getActivitiesForAdmin.mockResolvedValueOnce(
        userSettingsDBResponseDummy.activity_sequences[0].activities,
      );
      StripeServiceMock.getStripeCustomerId.mockResolvedValueOnce(null);

      const response = await activityService.getUserActivitiesForAdmin(userDummy.id, {
        email: dummyEmail,
        page_num: 1,
      });

      expect(response).toBeArrayOfSize(0);
    });
  });
});
