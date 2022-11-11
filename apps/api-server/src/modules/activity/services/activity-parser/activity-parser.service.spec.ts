import { Test } from '@nestjs/testing';
import { ActivitySequenceRepositoryMock } from '../../../../../test/mocks';
import { ActivitySequence } from '../../entities/activity-sequence.entity';
import { Activity } from '../../entities/activity.entity';
import { ActivitySequenceRepository } from '../../repositories/activity-sequence.repository';
import { ActivityParserService } from './activity-parser.service';
import { serializedActivityDummy, userDummy, userSettingsDBResponseDummy } from '../../../../../test/dummies';

describe('ActivityParserService', () => {
  let activityParserService: ActivityParserService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [ActivityParserService, ActivitySequenceRepository],
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

      const result = await activityParserService.deserialize(serializedActivityDummy, userDummy.id);

      expect(result).toBeDefined();
      expect(result).toBeArray();
      expect(result[0].sequence).toBeInstanceOf(ActivitySequence);
      expect(result[0].activities).toBeArray();
      expect(result[0].activities.every((e) => e instanceof Activity)).toBeTrue();
    });
  });
});
