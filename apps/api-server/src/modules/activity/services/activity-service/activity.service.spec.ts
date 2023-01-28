import { Test } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { SENTRY_TOKEN } from '@ntegral/nestjs-sentry';
import { QueueMock, userDummy } from '../../../../../test/dummies';
import { ActivityService } from './activity.service';
import { UserRepository } from '../../../user/repositories/user.repository';
import { SentryServiceMock, UserRepositoryMock } from '../../../../../test/mocks/index';

describe('ActivityService', () => {
  let activityService: ActivityService;
  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        ActivityService,
        UserRepository,
        {
          provide: getQueueToken('activity-image'),
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

    it('negative: should return a not found exception if user is not found in DB', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      const errorMessage = `User with ID: ${userDummy.id} is not authorized to delete this image`;
      let exception: any;

      try {
        await activityService.deleteActivityImageFromUploadIO(userDummy.id, '/dummy/file/path/file-name.png');
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(UnauthorizedException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('positive: should add the incoming image path to the queue to delete the image on upload.io', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);

      await activityService.deleteActivityImageFromUploadIO(userDummy.id, `/dummy/file/path/${userDummy.id}`);

      expect(QueueMock.add).toBeCalledWith('delete-activity-image', {
        user_id: userDummy.id,
        filePath: `/dummy/file/path/${userDummy.id}`,
      });
    });
  });
});
