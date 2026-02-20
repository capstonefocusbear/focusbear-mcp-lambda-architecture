import { Test } from '@nestjs/testing';
import { SENTRY_TOKEN } from '@app/observability';
import { randomUUID } from 'crypto';
import { getQueueToken } from '@nestjs/bull';
import { ActivitySequenceRepositoryMock, SentryServiceMock } from '../../../../../test/mocks';
import { ActivitySequence } from '../../entities/activity-sequence.entity';
import { Activity } from '../../entities/activity.entity';
import { ActivitySequenceRepository } from '../../repositories/activity-sequence.repository';
import { ActivityParserService } from './activity-parser.service';
import {
  serializedActivityDummy,
  userDummy,
  userSettingsDBResponseDummy,
  QueueMock,
} from '../../../../../test/dummies';
import { standaloneHabitPackDummy } from '../../../../../test/dummies/habit-packs.dummies';
import { LogQuantityQuestion } from '../../entities/log-quantity-questions';
import { LogSummaryType } from '../../domain/log-summary-type.enum';
import { ActivityType } from '../../domain/activity-type.enum';
import { BullQueues, BullWorkers } from '../../../../shared/utils/constants';

describe('ActivityParserService', () => {
  let activityParserService: ActivityParserService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        ActivityParserService,
        ActivitySequenceRepository,
        {
          provide: SENTRY_TOKEN,
          useValue: SentryServiceMock,
        },
        {
          provide: getQueueToken(BullQueues.EMOJI_GENERATION),
          useValue: QueueMock,
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
    beforeEach(() => {
      QueueMock.add.mockClear();
    });

    it('positive: should return a serialized activities', async () => {
      const { activity_sequences } = userSettingsDBResponseDummy;

      const result = activityParserService.serialize(activity_sequences);

      expect(result).toBeDefined();
      expect(result.break_activities).toBeArray();
      expect(result.evening_activities).toBeArray();
      expect(result.morning_activities).toBeArray();
    });

    it('positive: should include geofence_id in serialized habit when present', async () => {
      const geofenceId = randomUUID();
      const sequenceId = randomUUID();
      const result = activityParserService.serialize([
        {
          type: ActivityType.morning,
          id: sequenceId,
          activity_ids: ['activity-1'],
          activities: [
            {
              id: 'activity-1',
              activity_sequence_id: sequenceId,
              geofence_id: geofenceId,
              duration_seconds: 60,
              activity_data: { name: 'Hydrate', habit_icon: '💧' },
            } as any,
          ],
        } as any,
      ]);

      expect(result.morning_activities?.[0]?.geofence_id).toBe(geofenceId);
    });

    it('positive: should include geofence_id as null when it is not set', async () => {
      const sequenceId = randomUUID();
      const result = activityParserService.serialize([
        {
          type: ActivityType.morning,
          id: sequenceId,
          activity_ids: ['activity-1'],
          activities: [
            {
              id: 'activity-1',
              activity_sequence_id: sequenceId,
              geofence_id: null,
              duration_seconds: 60,
              activity_data: { name: 'Hydrate', habit_icon: '💧' },
            } as any,
          ],
        } as any,
      ]);

      expect(result.morning_activities?.[0]?.geofence_id).toBeNull();
    });

    it('positive: should add emoji generation job for activities without habit icons', async () => {
      // Create activity sequences with activities that have no habit icons
      const activitySequencesWithNoIcons = [
        {
          type: ActivityType.morning,
          activities: [
            {
              id: 'test-activity-1',
              name: 'Test Activity 1',
              activity_data: {
                name: 'Test Activity 1',
                habit_icon: '', // Empty habit icon
              },
            },
            {
              id: 'test-activity-2',
              name: 'Test Activity 2',
              activity_data: {
                name: 'Test Activity 2',
                habit_icon: null, // Null habit icon
              },
            },
            {
              id: 'test-activity-3',
              name: 'Test Activity 3',
              activity_data: {
                name: 'Test Activity 3',
                habit_icon: '🏃‍♂️', // Has habit icon
              },
            },
          ],
          activity_ids: ['test-activity-1', 'test-activity-2', 'test-activity-3'],
        },
      ];

      const result = activityParserService.serialize(activitySequencesWithNoIcons);

      // Verify that emoji generation jobs were added for activities without icons
      expect(QueueMock.add).toHaveBeenCalledTimes(2);
      expect(QueueMock.add).toHaveBeenCalledWith(BullWorkers.GENERATE_ACTIVITY_EMOJI, {
        activity_id: 'test-activity-1',
        activity_name: 'test-activity-1',
      });
      expect(QueueMock.add).toHaveBeenCalledWith(BullWorkers.GENERATE_ACTIVITY_EMOJI, {
        activity_id: 'test-activity-2',
        activity_name: 'test-activity-2',
      });

      // Verify that no job was added for activity with existing icon
      expect(QueueMock.add).not.toHaveBeenCalledWith(BullWorkers.GENERATE_ACTIVITY_EMOJI, {
        activity_id: 'test-activity-3',
        activity_name: 'test-activity-3',
      });

      // Verify the result structure
      expect(result).toBeDefined();
      expect(result.morning_activities).toBeArray();
      expect(result.morning_activities).toHaveLength(3);
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
      expect(result.length).toBe(4);
    });
  });

  describe('createLogQuantityQuestions', () => {
    it("positive: should create log quantity question for activity if log quantity is true and it doesn't have any log quantity questions yet (convert old type log quantity activities to new format using log quantity questions)", () => {
      const activityDummy = {
        name: 'test',
        id: randomUUID(),
        log_summary_type: LogSummaryType.SUM,
        log_quantity: true,
        log_quantity_questions: [],
      };
      const response = activityParserService.createLogQuantityQuestions(activityDummy, userDummy.id);

      expect(response[0]).toStrictEqual(
        new LogQuantityQuestion({
          question: `Log quantity for ${activityDummy.name}`,
          activity_id: activityDummy.id,
          user_id: userDummy.id,
          log_summary_type: activityDummy.log_summary_type,
        }),
      );
    });
  });
});
