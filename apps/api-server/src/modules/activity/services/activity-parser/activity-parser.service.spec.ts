import { Test } from '@nestjs/testing';
import { SENTRY_TOKEN } from '@ntegral/nestjs-sentry';
import { ActivitySequenceRepositoryMock, SentryServiceMock } from '../../../../../test/mocks';
import { ActivitySequence } from '../../entities/activity-sequence.entity';
import { Activity } from '../../entities/activity.entity';
import { ActivitySequenceRepository } from '../../repositories/activity-sequence.repository';
import { ActivityParserService } from './activity-parser.service';
import { serializedActivityDummy, userDummy, userSettingsDBResponseDummy } from '../../../../../test/dummies';
import { standaloneHabitPackDummy } from '../../../../../test/dummies/habit-packs.dummies';

describe('ActivityParserService', () => {
  let activityParserService: ActivityParserService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        ActivityParserService,
        ActivitySequenceRepository,
        {
          provide: SENTRY_TOKEN,
          useValue: SentryServiceMock,
        },
      ],
    })
      .overrideProvider(ActivitySequenceRepository)
      .useValue(ActivitySequenceRepositoryMock)
      .compile();

    activityParserService = moduleRef.get<ActivityParserService>(ActivityParserService);
  });

  it('should be defined', () => {
    expect(activityParserService).toBeDefined();
  });

  describe('serialize', () => {
    it('positive: should return a serialized activities', async () => {
      const { activity_sequences } = userSettingsDBResponseDummy;

      const result = activityParserService.serialize(activity_sequences);

      expect(result).toBeDefined();
      expect(result.break_activities).toBeArray();
      expect(result.evening_activities).toBeArray();
      expect(result.morning_activities).toBeArray();
    });

    it('positive: should return a deserialized activities', async () => {
      ActivitySequenceRepositoryMock.findOneByTypeForUser.mockReturnValue(userDummy);

      const { deserializedActivities } = await activityParserService.deserialize(serializedActivityDummy, userDummy.id);

      expect(deserializedActivities).toBeDefined();
      expect(deserializedActivities).toBeArray();
      expect(deserializedActivities[0].sequence).toBeInstanceOf(ActivitySequence);
      expect(deserializedActivities[0].activities).toBeArray();
      expect(deserializedActivities[0].activities.every((e) => e instanceof Activity)).toBeTrue();
    });
  });

  describe('calculateSequenceDuration', () => {
    it('positive: should return 0 for empty sequence', () => {
      const sequence = [];
      const result = activityParserService.calculateSequenceDuration(sequence);

      expect(result).toBe(0);
    });

    it('positive: should return correct sequence duration', () => {
      // has duration of 600 seconds
      const sequence = standaloneHabitPackDummy.standalone_activities;
      const result = activityParserService.calculateSequenceDuration(sequence);

      expect(result).toBe(600);
    });
  });

  describe('getLogQuantityQuestions', () => {
    it('positive: given activities with log quantity questions, it should extract and create log quantity questions and return them in an array', () => {
      const result = activityParserService.getLogQuantityQuestions(serializedActivityDummy, userDummy.id);

      expect(result).toBeArray();
      expect(result.length).toBe(2);
    });
  });
});
