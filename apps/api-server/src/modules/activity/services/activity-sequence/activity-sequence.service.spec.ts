import { Test } from '@nestjs/testing';
import { SENTRY_TOKEN } from '@ntegral/nestjs-sentry';
import { ActivitiesArrayDummy, userDummy } from '../../../../../test/dummies';
import { ActivityRepositoryMock, SentryServiceMock } from '../../../../../test/mocks';
import { ActivityRepository } from '../../repositories/activity.repository';
import { ActivitySequenceService } from './activity-sequence.service';

describe('ActivitySequenceService', () => {
  let activitySequenceService: ActivitySequenceService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        ActivitySequenceService,
        ActivityRepository,
        {
          provide: SENTRY_TOKEN,
          useValue: SentryServiceMock,
        },
      ],
    })
      .overrideProvider(ActivityRepository)
      .useValue(ActivityRepositoryMock)
      .compile();

    activitySequenceService = moduleRef.get<ActivitySequenceService>(ActivitySequenceService);
  });

  it('should be defined', () => {
    expect(activitySequenceService).toBeDefined();
  });

  describe('getUserRoutineDailyDurations', () => {
    it('getUserRoutineDailyDurations', async () => {
      ActivityRepositoryMock.orm.find.mockResolvedValueOnce(ActivitiesArrayDummy.morning_activities);
      ActivityRepositoryMock.orm.find.mockResolvedValueOnce(ActivitiesArrayDummy.evening_activities);

      const result = await activitySequenceService.getUserRoutineDailyDurations(userDummy.id);

      expect(result).toEqual({
        morningRoutineDailyDurations: {
          MON: 600,
          TUE: 600,
          WED: 600,
          THU: 600,
          FRI: 600,
          SAT: 600,
          SUN: 600,
        },
        eveningRoutineDailyDurations: {
          MON: 480,
          TUE: 480,
          WED: 480,
          THU: 480,
          FRI: 480,
          SAT: 480,
          SUN: 480,
        },
      });
    });
  });
});
