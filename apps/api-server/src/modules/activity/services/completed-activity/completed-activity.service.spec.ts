import { BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { randomInt, randomUUID } from 'crypto';
import { SENTRY_TOKEN } from '@ntegral/nestjs-sentry';
import { PusherService } from '@app/pusher';
import { PusherBeamsService } from '@app/pusher-beams';
import { I18nService } from 'nestjs-i18n';
import { mockDeep } from 'jest-mock-extended';
import { BullModule } from '@nestjs/bull';
import { BullWorkers, BullQueues, UTC_TO_IANA_MAP, DEFAULT_IANA_TIMEZONE } from '../../../../shared/utils/constants';
import {
  ActivityRepositoryMock,
  ActivitySequenceRepositoryMock,
  CompletedActivityRepositoryMock,
  CompletedActivitySequenceServiceMock,
  CompletedFocusBlockRepositoryMock,
  DeviceServiceMock,
  PusherServiceMock,
  SentryServiceMock,
  UserRepositoryMock,
  UserSettingsServiceMock,
  UserDailyStatsServiceMock,
  LogQuantityAnswersRepositoryMock,
  LogQuantityQuestionsRepositoryMock,
  UserServiceMock,
  PusherBeamsServiceMock,
  CompletedActivityQueueMock,
} from '../../../../../test/mocks';
import {
  ActivitiesArrayDummy,
  ActivityDummy,
  ActivityDummyWithCompetencyChoices,
  ActivitySequenceDummy,
  ActivitySequenceWithHighPriorityActivitiesDummy,
  ActivitySequenceWithoutHighPriorityActivitiesDummy,
  BreakActivitySequenceDummy,
  compledtedActivitiesSortedByDateAndIdDummy,
  compledtedActivitiesSortedByIdDummy,
  completedActivitiesArrayDummy,
  completedActivitiesWithNotesDummyArray,
  CompletedActivityDummy,
  CompletedFocusBlockDummy,
  createdLogQuantityAnswerDummies,
  DeviceDummy,
  eveningActivitiesDBResponseDummy,
  EveningActivitySequenceDummy,
  fastifyRequestDummy,
  LeaderDeviceDummy,
  logQuantityAnswerDummy,
  logQuantityAnswersDtoDummy,
  MorningActivitySequenceDummy,
  sequenceWithActivitiesForDifferentDays,
  UncompletedSequenceLogDummy,
  userDummy,
} from '../../../../../test/dummies';
import { DeviceService } from '../../../device/services/device/device.service';
import { CreateCompletedActivityDto } from '../../dto/create-completed-activity.dto';
import { ActivitySequenceRepository } from '../../repositories/activity-sequence.repository';
import { CompletedActivityRepository } from '../../repositories/completed-activity.repository';
import { CompletedActivityService } from './completed-activity.service';
import { UserRepository } from '../../../user/repositories/user.repository';
import { ActivitySequence } from '../../entities/activity-sequence.entity';
import { CompletedActivity } from '../../entities/completed-activity.entity';
import { ActivityRepository } from '../../repositories/activity.repository';
import { CompletedActivitySequenceService } from '../completed-activity-sequence/completed-activity-sequence.service';
import { User } from '../../../user/entities/user.entity';
import { Activity } from '../../entities/activity.entity';
import { ActivityStatType } from '../../domain/activity-stat-type.enum';
import { CompletedActivityStats } from '../../domain/completed-activity-stats.model';
import { CompletedFocusBlockRepository } from '../../../focus-mode/repositories/completed-focus-block.repository';
import { ActivityType } from '../../domain/activity-type.enum';
import { DaySummary } from '../../domain/day-summary.mode';
import { UserSettingsService } from '../../../user/services/user-settings/user-settings.service';
import { UserDailyStatsService } from '../../../user/services/user-daily-stats/user-daily-stats.service';
import { HelperCommonService } from '../../../helper/services/helper-common/helper-common.service';
import { DaysOfWeek } from '../../domain/days-of-week.enum';
import { ActivitySequenceService } from '../activity-sequence/activity-sequence.service';
import { LogQuantityAnswersRepository } from '../../repositories/log-quantity-answers.repository';
import { LogQuantityQuestionsRepository } from '../../repositories/log-quantity-questions.repository';
import { LogQuantityAnswersStats } from '../../domain/log-quantity-answers-stats.model';
import { LogQuantityAnswer } from '../../entities/log-quantity-answers';
import { UserService } from '../../../user/services/user/user.service';
import { ActivityPriority } from '../../domain/activity-priority.enum';

describe('CompletedActivityService', () => {
  let completedActivityService: CompletedActivityService;
  let moduleRef: TestingModule;
  const i18nServiceMock = mockDeep<I18nService>();

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        BullModule.registerQueue({
          name: BullQueues.COMPLETED_ACTIVITY,
        }),
      ],
      providers: [
        CompletedActivityService,
        CompletedActivityRepository,
        DeviceService,
        ActivitySequenceRepository,
        UserRepository,
        ActivityRepository,
        CompletedActivitySequenceService,
        PusherService,
        CompletedFocusBlockRepository,
        UserSettingsService,
        UserDailyStatsService,
        HelperCommonService,
        ActivitySequenceService,
        LogQuantityAnswersRepository,
        LogQuantityQuestionsRepository,
        UserService,
        PusherBeamsService,
        {
          provide: I18nService,
          useValue: i18nServiceMock,
        },
        {
          provide: SENTRY_TOKEN,
          useValue: SentryServiceMock,
        },
      ],
    })
      .overrideProvider(CompletedActivityRepository)
      .useValue(CompletedActivityRepositoryMock)
      .overrideProvider(ActivitySequenceRepository)
      .useValue(ActivitySequenceRepositoryMock)
      .overrideProvider(DeviceService)
      .useValue(DeviceServiceMock)
      .overrideProvider(UserRepository)
      .useValue(UserRepositoryMock)
      .overrideProvider(ActivityRepository)
      .useValue(ActivityRepositoryMock)
      .overrideProvider(CompletedActivitySequenceService)
      .useValue(CompletedActivitySequenceServiceMock)
      .overrideProvider(PusherService)
      .useValue(PusherServiceMock)
      .overrideProvider(CompletedFocusBlockRepository)
      .useValue(CompletedFocusBlockRepositoryMock)
      .overrideProvider(UserSettingsService)
      .useValue(UserSettingsServiceMock)
      .overrideProvider(UserDailyStatsService)
      .useValue(UserDailyStatsServiceMock)
      .overrideProvider(LogQuantityAnswersRepository)
      .useValue(LogQuantityAnswersRepositoryMock)
      .overrideProvider(LogQuantityQuestionsRepository)
      .useValue(LogQuantityQuestionsRepositoryMock)
      .overrideProvider(UserService)
      .useValue(UserServiceMock)
      .overrideProvider(PusherBeamsService)
      .useValue(PusherBeamsServiceMock)
      .overrideProvider('BullQueue_completed-activity')
      .useValue(CompletedActivityQueueMock)
      .compile();

    completedActivityService = moduleRef.get<CompletedActivityService>(CompletedActivityService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
    jest.useRealTimers();
    CompletedActivityQueueMock.add.mockResolvedValue({ id: 'test-job-id' });

    // Set up default mock for isVerboseLoggingAllowed
    UserServiceMock.isVerboseLoggingAllowed.mockResolvedValue({
      isVerboseLoggingAllowed: false,
      user: null,
    });
  });

  afterAll(async () => {
    if (moduleRef) {
      // Close Redis connection if it exists
      const { redisClient } = completedActivityService as any;
      if (redisClient && typeof redisClient.disconnect === 'function') {
        redisClient.disconnect();
      }
      await moduleRef.close();
    }
  });

  it('should be defined', () => {
    expect(completedActivityService).toBeDefined();
  });

  describe('completeActivity', () => {
    const startTime = new Date(Date.now() - 60);
    const finishTime = new Date(Date.now() - 1);

    const randomQuantity = randomInt(20);
    const completedActivity: CreateCompletedActivityDto = {
      activity_id: ActivityDummy.id,
      quantity_logged: randomQuantity,
      duration_logged: 600,
      note_logged: 'some text',
      device_id: DeviceDummy.id,
      activity_sequence_id: ActivityDummy.activity_sequence_id,
      start_time: startTime,
      finish_time: finishTime,
      metadata: { is_skipped: false },
    };

    const completedActivityUpsertFormat = {
      activity_id: ActivityDummy.id,
      quantity_logged: randomQuantity,
      duration_logged: 600,
      activity_note: 'some text',
      activity_sequence_id: ActivityDummy.activity_sequence_id,
      start_time: startTime,
      finish_time: finishTime,
      metadata: { is_skipped: false },
    };

    const user_id = userDummy.id;

    const sequenceWhenThereIsNextActivity = new ActivitySequence({
      ...ActivitySequenceDummy,
      activity_ids: [completedActivity.activity_id, ...ActivitySequenceDummy.activity_ids],
      activities: [
        new Activity({
          id: completedActivity.activity_id,
          activity_sequence_id: ActivitySequenceDummy.id,
          days_of_week: [DaysOfWeek.ALL],
        }),
        new Activity({
          id: ActivitySequenceDummy.activity_ids[0],
          activity_sequence_id: ActivitySequenceDummy.id,
          days_of_week: [DaysOfWeek.ALL],
        }),
      ],
    });

    const sequenceWhenThereIsNoNextActivity = new ActivitySequence({
      ...ActivitySequenceDummy,
      activity_ids: [...ActivitySequenceDummy.activity_ids, completedActivity.activity_id],
      activities: [],
    });

    it('negative: should throw NotFoundException if activity sequence does not exist', async () => {
      ActivitySequenceRepositoryMock.orm.findOne.mockResolvedValueOnce(null);
      ActivityRepositoryMock.orm.findOneBy.mockResolvedValueOnce(ActivityDummy);
      const errorMessage = `Activity Sequence with id: ${completedActivity.activity_sequence_id} does not exist!`;
      let exception: any;

      try {
        await completedActivityService.completeActivity(completedActivity, fastifyRequestDummy.headers, { user_id });
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('negative: should throw NotFoundException if activity does not exist', async () => {
      ActivitySequenceRepositoryMock.orm.findOne.mockResolvedValueOnce(ActivitySequenceDummy);
      ActivityRepositoryMock.orm.findOneBy.mockResolvedValueOnce(null);
      const errorMessage = `Activity with id: ${completedActivity.activity_id} does not exist!`;
      let exception: any;

      try {
        await completedActivityService.completeActivity(completedActivity, fastifyRequestDummy.headers, { user_id });
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('negative: should throw NotFoundException if user does not exist', async () => {
      ActivitySequenceRepositoryMock.orm.findOne.mockResolvedValueOnce(ActivitySequenceDummy);
      ActivityRepositoryMock.orm.findOneBy.mockResolvedValueOnce(ActivityDummy);
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(null);
      const errorMessage = `User with id: ${user_id} does not exist!`;
      let exception: any;

      try {
        await completedActivityService.completeActivity(completedActivity, fastifyRequestDummy.headers, { user_id });
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('negative: should throw BadRequestException if the completing activity cannot be created without choice provided', async () => {
      const activityWithChoices: Activity = {
        ...ActivityDummy,
        has_choices: true,
        choices: [{ ...ActivityDummy, id: randomUUID(), parent_id: ActivityDummy.id }],
      };
      ActivitySequenceRepositoryMock.orm.findOne.mockResolvedValueOnce(ActivitySequenceDummy);
      ActivityRepositoryMock.orm.findOneBy.mockResolvedValueOnce(activityWithChoices);
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(userDummy);

      const errorMsg = `Activity with id: ${activityWithChoices.id} cannot be completed without choice_id provided`;
      let exception: any;

      try {
        await completedActivityService.completeActivity(completedActivity, fastifyRequestDummy.headers, { user_id });
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(BadRequestException);
      expect(exception.message).toEqual(errorMsg);
    });

    it('positive: the target device should be marked as leader', async () => {
      ActivitySequenceRepositoryMock.orm.findOne.mockResolvedValueOnce(sequenceWhenThereIsNextActivity);
      ActivityRepositoryMock.orm.findOneBy.mockResolvedValueOnce(ActivityDummy);
      UserRepositoryMock.orm.findOne.mockResolvedValue(userDummy);
      CompletedActivityRepositoryMock.upsertActivity.mockResolvedValueOnce({ id: randomUUID() });
      CompletedActivityRepositoryMock.orm.find.mockResolvedValueOnce([]);
      CompletedActivitySequenceServiceMock.getOrCreateCompletingSequenceLog.mockResolvedValueOnce(
        UncompletedSequenceLogDummy,
      );

      await completedActivityService.completeActivity(completedActivity, fastifyRequestDummy.headers, { user_id });

      expect(DeviceServiceMock.markAsLeader).toBeCalledWith(completedActivity.device_id, user_id);
    });

    it('positive: if there is the next activity in the sequence, its id should be set as current_activity_id for the given User', async () => {
      ActivitySequenceRepositoryMock.orm.findOne.mockResolvedValueOnce(sequenceWhenThereIsNextActivity);
      ActivityRepositoryMock.orm.findOneBy.mockResolvedValueOnce(ActivityDummy);
      UserRepositoryMock.orm.findOne.mockResolvedValue(userDummy);
      CompletedActivityRepositoryMock.upsertActivity.mockResolvedValueOnce({ id: randomUUID() });
      CompletedActivityRepositoryMock.orm.find.mockResolvedValueOnce([
        { activity_id: sequenceWhenThereIsNextActivity.activity_ids[0] },
      ]);
      CompletedActivitySequenceServiceMock.getOrCreateCompletingSequenceLog.mockResolvedValueOnce(
        UncompletedSequenceLogDummy,
      );

      await completedActivityService.completeActivity(completedActivity, fastifyRequestDummy.headers, { user_id });

      expect(UserRepositoryMock.orm.update).toBeCalledWith(user_id, {
        current_activity_id: sequenceWhenThereIsNextActivity.activity_ids[1],
        current_activity_sequence_id: sequenceWhenThereIsNextActivity.id,
        current_activity_assigned_at: expect.toBeDateString(),
        current_completing_sequence_log_id: UncompletedSequenceLogDummy.id,
        current_sequence_skipped_activities: null,
        has_received_inactivity_warning: false,
        updated_at: expect.toBeDateString(),
      });
    });

    it('positive: if there is no next activity in the sequence, current_activity_id should be set NULL for the given User', async () => {
      const userWithCurrentActivity: User = {
        ...userDummy,
        current_activity_id: completedActivity.activity_id,
        current_activity_sequence_id: completedActivity.activity_sequence_id,
        current_sequence_started_at: new Date(),
      };
      ActivitySequenceRepositoryMock.orm.findOne.mockResolvedValueOnce(sequenceWhenThereIsNoNextActivity);
      ActivityRepositoryMock.orm.findOneBy.mockResolvedValueOnce(ActivityDummy);
      UserRepositoryMock.orm.findOne.mockResolvedValue(userWithCurrentActivity);
      CompletedActivitySequenceServiceMock.completeActivitySequence.mockResolvedValueOnce(null);
      CompletedActivityRepositoryMock.upsertActivity.mockResolvedValueOnce({ id: randomUUID() });
      CompletedActivityRepositoryMock.orm.find.mockResolvedValueOnce([]);
      CompletedActivitySequenceServiceMock.getOrCreateCompletingSequenceLog.mockResolvedValueOnce(
        UncompletedSequenceLogDummy,
      );

      await completedActivityService.completeActivity(completedActivity, fastifyRequestDummy.headers, { user_id });

      expect(UserRepositoryMock.orm.update).toBeCalledWith(user_id, {
        current_activity_id: null,
        current_activity_sequence_id: null,
        current_activity_assigned_at: null,
        last_completed_sequence_id: userWithCurrentActivity.current_activity_sequence_id,
        last_completed_sequence_at: expect.toBeDateString(),
        current_sequence_started_at: null,
        last_completed_sequence_started_at: expect.toBeDateString(),
        current_completing_sequence_log_id: null,
        current_sequence_skipped_activities: null,
        has_received_inactivity_warning: false,
        updated_at: expect.toBeDateString(),
      });
    });

    it('positive: completed activity record should be created', async () => {
      ActivitySequenceRepositoryMock.orm.findOne.mockResolvedValueOnce(sequenceWhenThereIsNextActivity);
      ActivityRepositoryMock.orm.findOneBy.mockResolvedValueOnce(ActivityDummy);
      UserRepositoryMock.orm.findOne.mockResolvedValue(userDummy);
      DeviceServiceMock.markAsLeader.mockResolvedValue(LeaderDeviceDummy);
      CompletedActivitySequenceServiceMock.completeActivitySequence.mockResolvedValueOnce(null);
      CompletedActivityRepositoryMock.upsertActivity.mockResolvedValueOnce({ id: randomUUID() });
      CompletedActivityRepositoryMock.orm.find.mockResolvedValueOnce([]);
      CompletedActivitySequenceServiceMock.getOrCreateCompletingSequenceLog.mockResolvedValueOnce(
        UncompletedSequenceLogDummy,
      );

      await completedActivityService.completeActivity(completedActivity, fastifyRequestDummy.headers, { user_id });
      expect(CompletedActivityRepositoryMock.upsertActivity).toBeCalledWith(
        new CompletedActivity(
          { ...completedActivityUpsertFormat, user_id, completed_sequence_id: undefined },
          { generateId: false, log_quantity: ActivityDummy.log_quantity },
        ),
      );
    });

    it('positive: if activity has log quantity answers they should be saved', async () => {
      ActivitySequenceRepositoryMock.orm.findOne.mockResolvedValueOnce(sequenceWhenThereIsNextActivity);
      ActivityRepositoryMock.orm.findOneBy.mockResolvedValueOnce(ActivityDummy);
      UserRepositoryMock.orm.findOne.mockResolvedValue(userDummy);
      CompletedActivityRepositoryMock.upsertActivity.mockResolvedValueOnce({ id: randomUUID() });
      CompletedActivityRepositoryMock.orm.find.mockResolvedValueOnce([]);
      CompletedActivitySequenceServiceMock.getOrCreateCompletingSequenceLog.mockResolvedValueOnce(
        UncompletedSequenceLogDummy,
      );
      LogQuantityAnswersRepositoryMock.orm.create.mockReturnValueOnce(createdLogQuantityAnswerDummies);
      LogQuantityAnswersRepositoryMock.orm.insert.mockResolvedValueOnce({
        identifiers: [{ id: createdLogQuantityAnswerDummies[0].id }, { id: createdLogQuantityAnswerDummies[1].id }],
      });

      await completedActivityService.completeActivity(
        { ...completedActivity, log_quantity_answers: logQuantityAnswersDtoDummy },
        fastifyRequestDummy.headers,
        { user_id },
      );

      expect(LogQuantityAnswersRepositoryMock.orm.insert).toBeCalledWith(createdLogQuantityAnswerDummies);
    });

    it('positive: push notification should be sent via pusher', async () => {
      ActivitySequenceRepositoryMock.orm.findOne.mockResolvedValueOnce(sequenceWhenThereIsNextActivity);
      ActivityRepositoryMock.orm.findOneBy.mockResolvedValueOnce(ActivityDummy);
      UserRepositoryMock.orm.findOne.mockResolvedValue(userDummy);
      DeviceServiceMock.markAsLeader.mockResolvedValue(LeaderDeviceDummy);
      CompletedActivitySequenceServiceMock.completeActivitySequence.mockResolvedValueOnce(null);
      const completedActivityId = randomUUID();
      CompletedActivityRepositoryMock.upsertActivity.mockResolvedValueOnce({ id: completedActivityId });
      CompletedActivityRepositoryMock.orm.find.mockResolvedValueOnce([]);
      CompletedActivitySequenceServiceMock.getOrCreateCompletingSequenceLog.mockResolvedValueOnce(
        UncompletedSequenceLogDummy,
      );

      await completedActivityService.completeActivity(completedActivity, fastifyRequestDummy.headers, { user_id });

      expect(CompletedActivityQueueMock.add).toBeCalledWith(
        BullWorkers.PROCESS_COMPLETED_ACTIVITY,
        expect.objectContaining({
          completedActivity,
          user_id,
          completed_activity_log_id: completedActivityId,
        }),
        expect.objectContaining({
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        }),
      );
    });

    it('positive: should enqueue background job for Pusher broadcasts', async () => {
      ActivitySequenceRepositoryMock.orm.findOne.mockResolvedValueOnce(sequenceWhenThereIsNextActivity);
      ActivityRepositoryMock.orm.findOneBy.mockResolvedValueOnce(ActivityDummy);
      UserRepositoryMock.orm.findOne.mockResolvedValue(userDummy);
      DeviceServiceMock.markAsLeader.mockResolvedValue(LeaderDeviceDummy);
      CompletedActivitySequenceServiceMock.completeActivitySequence.mockResolvedValueOnce(null);
      const completedActivityId = randomUUID();
      CompletedActivityRepositoryMock.upsertActivity.mockResolvedValueOnce({ id: completedActivityId });
      CompletedActivityRepositoryMock.orm.find.mockResolvedValueOnce([]);
      CompletedActivitySequenceServiceMock.getOrCreateCompletingSequenceLog.mockResolvedValueOnce(
        UncompletedSequenceLogDummy,
      );

      const result = await completedActivityService.completeActivity(completedActivity, fastifyRequestDummy.headers, {
        user_id,
      });

      expect(CompletedActivityQueueMock.add).toBeCalledWith(
        BullWorkers.PROCESS_COMPLETED_ACTIVITY,
        expect.objectContaining({
          completedActivity,
          user_id,
          completed_activity_log_id: completedActivityId,
        }),
        expect.objectContaining({
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        }),
      );
      expect(result).toBeDefined();
      expect(result.completed_activity_log.id).toBe(completedActivityId);
    });

    it('positive: should return macOS-compatible response with completed_activity_log and completed_choice_log IDs', async () => {
      const activityWithChoices: Activity = {
        ...ActivityDummy,
        has_choices: true,
        choices: [{ ...ActivityDummy, id: randomUUID(), parent_id: ActivityDummy.id }],
      };
      const dtoWithChoice: CreateCompletedActivityDto = {
        ...completedActivity,
        choice_id: activityWithChoices.choices[0].id,
      };
      const completedActivityId = randomUUID();
      const completedChoiceId = randomUUID();

      ActivitySequenceRepositoryMock.orm.findOne.mockResolvedValueOnce(sequenceWhenThereIsNextActivity);
      ActivityRepositoryMock.orm.findOneBy.mockResolvedValueOnce(activityWithChoices);
      UserRepositoryMock.orm.findOne.mockResolvedValue(userDummy);
      ActivityRepositoryMock.orm.findOneBy.mockResolvedValueOnce(activityWithChoices.choices[0]);
      DeviceServiceMock.markAsLeader.mockResolvedValue(LeaderDeviceDummy);
      CompletedActivitySequenceServiceMock.completeActivitySequence.mockResolvedValueOnce(null);
      CompletedActivityRepositoryMock.upsertActivity
        .mockResolvedValueOnce({ id: completedActivityId })
        .mockResolvedValueOnce({ id: completedChoiceId });
      CompletedActivityRepositoryMock.orm.find.mockResolvedValueOnce([]);
      CompletedActivitySequenceServiceMock.getOrCreateCompletingSequenceLog.mockResolvedValueOnce(
        UncompletedSequenceLogDummy,
      );

      const result = await completedActivityService.completeActivity(dtoWithChoice, fastifyRequestDummy.headers, {
        user_id,
      });

      // Verify macOS response structure
      expect(result).toBeDefined();
      expect(result).toHaveProperty('completed_activity_log');
      expect(result).toHaveProperty('completed_choice_log');
      expect(result).toHaveProperty('saved_log_quantity_answers');

      // Verify IDs are present (required for macOS)
      expect(result.completed_activity_log).toBeDefined();
      expect(result.completed_activity_log.id).toBe(completedActivityId);
      expect(result.completed_choice_log).toBeDefined();
      expect(result.completed_choice_log.id).toBe(completedChoiceId);

      // Verify background job is enqueued
      expect(CompletedActivityQueueMock.add).toBeCalledWith(
        BullWorkers.PROCESS_COMPLETED_ACTIVITY,
        expect.objectContaining({
          completedActivity: dtoWithChoice,
          user_id,
          completed_activity_log_id: completedActivityId,
          completed_choice_log_id: completedChoiceId,
        }),
        expect.objectContaining({
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        }),
      );
    });

    it('positive: should return macOS-compatible response for activities without choices (completed_choice_log should be null)', async () => {
      const completedActivityId = randomUUID();

      ActivitySequenceRepositoryMock.orm.findOne.mockResolvedValueOnce(sequenceWhenThereIsNextActivity);
      ActivityRepositoryMock.orm.findOneBy.mockResolvedValueOnce(ActivityDummy);
      UserRepositoryMock.orm.findOne.mockResolvedValue(userDummy);
      DeviceServiceMock.markAsLeader.mockResolvedValue(LeaderDeviceDummy);
      CompletedActivitySequenceServiceMock.completeActivitySequence.mockResolvedValueOnce(null);
      CompletedActivityRepositoryMock.upsertActivity.mockResolvedValueOnce({ id: completedActivityId });
      CompletedActivityRepositoryMock.orm.find.mockResolvedValueOnce([]);
      CompletedActivitySequenceServiceMock.getOrCreateCompletingSequenceLog.mockResolvedValueOnce(
        UncompletedSequenceLogDummy,
      );

      const result = await completedActivityService.completeActivity(completedActivity, fastifyRequestDummy.headers, {
        user_id,
      });

      // Verify macOS response structure
      expect(result).toBeDefined();
      expect(result).toHaveProperty('completed_activity_log');
      expect(result).toHaveProperty('completed_choice_log');
      expect(result).toHaveProperty('saved_log_quantity_answers');

      // Verify IDs are present (required for macOS)
      expect(result.completed_activity_log).toBeDefined();
      expect(result.completed_activity_log.id).toBe(completedActivityId);
      expect(result.completed_choice_log).toBeNull(); // Should be null for activities without choices

      // Verify background job is enqueued
      expect(CompletedActivityQueueMock.add).toBeCalledWith(
        BullWorkers.PROCESS_COMPLETED_ACTIVITY,
        expect.objectContaining({
          completedActivity,
          user_id,
          completed_activity_log_id: completedActivityId,
          completed_choice_log_id: undefined, // Should be undefined for activities without choices
        }),
        expect.objectContaining({
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        }),
      );
    });

    it('positive: should support idempotency with X-Idempotency-Key header - same request returns same IDs', async () => {
      const idempotencyKey = 'test-idempotency-key-123';
      const completedActivityId = randomUUID();
      const headers = { 'x-idempotency-key': idempotencyKey };

      // Mock Redis client for idempotency
      const { redisClient } = completedActivityService as any;
      redisClient.get = jest
        .fn()
        .mockResolvedValueOnce(null) // First call returns null (no cache)
        .mockResolvedValueOnce(
          JSON.stringify({
            // Second call returns cached response
            completed_activity_log: { id: completedActivityId },
            completed_choice_log: null,
          }),
        );
      redisClient.setex = jest.fn().mockResolvedValue('OK');

      ActivitySequenceRepositoryMock.orm.findOne.mockResolvedValueOnce(sequenceWhenThereIsNextActivity);
      ActivityRepositoryMock.orm.findOneBy.mockResolvedValueOnce(ActivityDummy);
      UserRepositoryMock.orm.findOne.mockResolvedValue(userDummy);
      DeviceServiceMock.markAsLeader.mockResolvedValue(LeaderDeviceDummy);
      CompletedActivitySequenceServiceMock.completeActivitySequence.mockResolvedValueOnce(null);
      CompletedActivityRepositoryMock.upsertActivity.mockResolvedValueOnce({ id: completedActivityId });
      CompletedActivityRepositoryMock.orm.find.mockResolvedValueOnce([]);
      CompletedActivitySequenceServiceMock.getOrCreateCompletingSequenceLog.mockResolvedValueOnce(
        UncompletedSequenceLogDummy,
      );

      // First request
      const result1 = await completedActivityService.completeActivity(completedActivity, headers, { user_id });

      // Second request with same idempotency key
      const result2 = await completedActivityService.completeActivity(completedActivity, headers, { user_id });

      // Verify both responses have same IDs
      expect(result1.completed_activity_log.id).toBe(completedActivityId);
      expect(result2.completed_activity_log.id).toBe(completedActivityId);
      expect(result1.completed_activity_log.id).toBe(result2.completed_activity_log.id);

      // Verify background job was only enqueued once (first request)
      expect(CompletedActivityQueueMock.add).toHaveBeenCalledTimes(1);

      // Verify Redis was called correctly
      expect(redisClient.get).toHaveBeenCalledWith(`idempotency:${idempotencyKey}`);
      expect(redisClient.setex).toHaveBeenCalledWith(`idempotency:${idempotencyKey}`, 86400, expect.any(String));
    }, 10000);

    it('positive: should handle daily stats asynchronously (already enqueued to BullQueues.STATS)', async () => {
      const completedActivityId = randomUUID();

      ActivitySequenceRepositoryMock.orm.findOne.mockResolvedValueOnce(sequenceWhenThereIsNextActivity);
      ActivityRepositoryMock.orm.findOneBy.mockResolvedValueOnce(ActivityDummy);
      UserRepositoryMock.orm.findOne.mockResolvedValue(userDummy);
      DeviceServiceMock.markAsLeader.mockResolvedValue(LeaderDeviceDummy);
      CompletedActivitySequenceServiceMock.completeActivitySequence.mockResolvedValueOnce(null);
      CompletedActivityRepositoryMock.upsertActivity.mockResolvedValueOnce({ id: completedActivityId });
      CompletedActivityRepositoryMock.orm.find.mockResolvedValueOnce([]);
      CompletedActivitySequenceServiceMock.getOrCreateCompletingSequenceLog.mockResolvedValueOnce(
        UncompletedSequenceLogDummy,
      );

      const result = await completedActivityService.completeActivity(completedActivity, fastifyRequestDummy.headers, {
        user_id,
      });

      // Verify response is returned quickly
      expect(result).toBeDefined();
      expect(result.completed_activity_log.id).toBe(completedActivityId);

      // Verify daily stats service is called (it handles its own Bull queue)
      expect(UserDailyStatsServiceMock.updateDailyStatsRoutineCompletion).toHaveBeenCalled();

      // Verify background job is enqueued for Pusher broadcasts
      expect(CompletedActivityQueueMock.add).toHaveBeenCalledWith(
        BullWorkers.PROCESS_COMPLETED_ACTIVITY,
        expect.objectContaining({
          completedActivity,
          user_id,
          completed_activity_log_id: completedActivityId,
        }),
        expect.objectContaining({
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        }),
      );
    });

    it('positive: should handle break activities without background job (break type returns early)', async () => {
      const breakActivity: Activity = {
        ...ActivityDummy,
        type: ActivityType.break,
      };
      const completedActivityId = randomUUID();

      ActivitySequenceRepositoryMock.orm.findOne.mockResolvedValueOnce(sequenceWhenThereIsNextActivity);
      ActivityRepositoryMock.orm.findOneBy.mockResolvedValueOnce(breakActivity);
      UserRepositoryMock.orm.findOne.mockResolvedValue(userDummy);
      DeviceServiceMock.markAsLeader.mockResolvedValue(LeaderDeviceDummy);
      CompletedActivityRepositoryMock.upsertActivity.mockResolvedValueOnce({ id: completedActivityId });
      CompletedActivityRepositoryMock.orm.find.mockResolvedValueOnce([]);

      const result = await completedActivityService.completeActivity(completedActivity, fastifyRequestDummy.headers, {
        user_id,
      });

      // Verify response is returned quickly
      expect(result).toBeDefined();
      expect(result.completed_activity_log.id).toBe(completedActivityId);

      // Verify break activity handling (should not call sequence completion)
      expect(CompletedActivitySequenceServiceMock.completeActivitySequence).not.toHaveBeenCalled();

      // Verify break activities return early and don't enqueue background jobs
      expect(CompletedActivityQueueMock.add).not.toHaveBeenCalled();

      // Verify break-specific daily stats are called
      expect(UserDailyStatsServiceMock.updateTimeSpentInBreaks).toHaveBeenCalled();
    });

    it('positive: if should_not_update_current_activity value is passed as true, user current activity properties should not be updated', async () => {
      ActivitySequenceRepositoryMock.orm.findOne.mockResolvedValueOnce(sequenceWhenThereIsNextActivity);
      ActivityRepositoryMock.orm.findOneBy.mockResolvedValueOnce(ActivityDummy);
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(userDummy);
      DeviceServiceMock.markAsLeader.mockResolvedValue(LeaderDeviceDummy);
      CompletedActivitySequenceServiceMock.completeActivitySequence.mockResolvedValueOnce(null);
      const completedActivityId = randomUUID();
      CompletedActivityRepositoryMock.create.mockResolvedValueOnce({ id: completedActivityId });
      CompletedActivitySequenceServiceMock.getOrCreateCompletingSequenceLog.mockResolvedValueOnce(
        UncompletedSequenceLogDummy,
      );

      await completedActivityService.completeActivity(
        { ...completedActivity, should_not_update_current_activity: true },
        fastifyRequestDummy.headers,
        { user_id },
      );

      expect(UserRepositoryMock.orm.update).toBeCalledTimes(0);
      expect(UserDailyStatsServiceMock.updateDailyStatsRoutineCompletion).toBeCalledTimes(0);
    });

    it('positive: if there is no next activity in the sequence, this sequence should be completed', async () => {
      const userWithCurrentActivity: User = {
        ...userDummy,
        current_activity_id: completedActivity.activity_id,
        current_activity_sequence_id: completedActivity.activity_sequence_id,
      };
      ActivitySequenceRepositoryMock.orm.findOne.mockResolvedValueOnce(sequenceWhenThereIsNoNextActivity);
      ActivityRepositoryMock.orm.findOneBy.mockResolvedValueOnce(ActivityDummy);
      UserRepositoryMock.orm.findOne.mockResolvedValue(userWithCurrentActivity);
      DeviceServiceMock.markAsLeader.mockResolvedValue(LeaderDeviceDummy);
      CompletedActivityRepositoryMock.upsertActivity.mockResolvedValueOnce({ id: randomUUID() });
      CompletedActivityRepositoryMock.orm.find.mockResolvedValueOnce([]);
      CompletedActivitySequenceServiceMock.getOrCreateCompletingSequenceLog.mockResolvedValueOnce(
        UncompletedSequenceLogDummy,
      );

      await completedActivityService.completeActivity(completedActivity, fastifyRequestDummy.headers, { user_id });

      expect(CompletedActivitySequenceServiceMock.completeActivitySequence).toBeCalledWith(
        UncompletedSequenceLogDummy.id,
        userWithCurrentActivity.id,
      );
    });

    it('positive: if activity requires choice, completed activity record should be created for parent activity and for choice activity', async () => {
      const activityWithChoices: Activity = {
        ...ActivityDummy,
        has_choices: true,
        choices: [{ ...ActivityDummy, id: randomUUID(), parent_id: ActivityDummy.id }],
      };
      const dtoWithChoice: CreateCompletedActivityDto = {
        ...completedActivity,
        choice_id: activityWithChoices.choices[0].id,
      };
      ActivitySequenceRepositoryMock.orm.findOne.mockResolvedValueOnce(sequenceWhenThereIsNextActivity);
      ActivityRepositoryMock.orm.findOneBy.mockResolvedValueOnce(activityWithChoices);
      UserRepositoryMock.orm.findOne.mockResolvedValue(userDummy);
      ActivityRepositoryMock.orm.findOneBy.mockResolvedValueOnce(activityWithChoices.choices[0]);
      DeviceServiceMock.markAsLeader.mockResolvedValue(LeaderDeviceDummy);
      CompletedActivitySequenceServiceMock.completeActivitySequence.mockResolvedValueOnce(null);
      CompletedActivityRepositoryMock.upsertActivity.mockResolvedValueOnce({ id: randomUUID() });
      CompletedActivityRepositoryMock.orm.find.mockResolvedValueOnce([]);
      CompletedActivitySequenceServiceMock.getOrCreateCompletingSequenceLog.mockResolvedValueOnce(
        UncompletedSequenceLogDummy,
      );

      await completedActivityService.completeActivity(dtoWithChoice, fastifyRequestDummy.headers, { user_id });

      expect(CompletedActivityRepositoryMock.upsertActivity).toBeCalledWith(
        new CompletedActivity(
          { ...completedActivityUpsertFormat, quantity_logged: null, user_id, completed_sequence_id: undefined },
          { generateId: false, log_quantity: false },
        ),
      );
      expect(CompletedActivityRepositoryMock.upsertActivity).toBeCalledWith(
        new CompletedActivity(
          {
            ...completedActivityUpsertFormat,
            activity_id: dtoWithChoice.choice_id,
            activity_sequence_id: null,
            user_id,
          },
          { generateId: false, log_quantity: activityWithChoices.choices[0].log_quantity },
        ),
      );
    });

    it('positive: if user cut off time has been reached, set the next activity to be the next high priority activity in sequence when marking activity as completed', async () => {
      // Mock time to 6:30 PM UTC (after 6 PM cutoff)
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2022-10-06T18:30:00.000Z'));
      const activity: CreateCompletedActivityDto = {
        activity_id: ActivitySequenceWithHighPriorityActivitiesDummy.activities[0].id,
        quantity_logged: randomQuantity,
        duration_logged: 600,
        note_logged: 'some text',
        device_id: DeviceDummy.id,
        activity_sequence_id: ActivitySequenceWithHighPriorityActivitiesDummy.id,
        start_time: new Date(Date.now() - 60),
        finish_time: new Date(Date.now() - 1),
        metadata: { is_skipped: false },
      };
      const dbActivityDummy = {
        ...ActivitySequenceWithHighPriorityActivitiesDummy.activities[0],
        activity_data: { name: 'Running', priority: ActivityPriority.STANDARD },
      };
      ActivitySequenceRepositoryMock.orm.findOne.mockResolvedValueOnce(ActivitySequenceWithHighPriorityActivitiesDummy);
      ActivityRepositoryMock.orm.findOneBy.mockResolvedValueOnce(dbActivityDummy);
      UserRepositoryMock.orm.findOne.mockResolvedValue({
        ...userDummy,
        cutoff_time_for_non_high_priority_activities: '18:00',
      });
      DeviceServiceMock.markAsLeader.mockResolvedValue(LeaderDeviceDummy);
      const completingSequenceLogId = randomUUID();
      CompletedActivitySequenceServiceMock.getOrCreateCompletingSequenceLog.mockResolvedValueOnce({
        ...UncompletedSequenceLogDummy,
        activity_sequence_id: ActivitySequenceWithHighPriorityActivitiesDummy.id,
        id: completingSequenceLogId,
      });
      CompletedActivitySequenceServiceMock.completeActivitySequence.mockResolvedValueOnce(null);
      CompletedActivityRepositoryMock.upsertActivity.mockResolvedValueOnce({ id: randomUUID() });
      CompletedActivityRepositoryMock.orm.find.mockResolvedValueOnce([]);

      await completedActivityService.completeActivity(activity, fastifyRequestDummy.headers, { user_id });

      expect(UserRepositoryMock.orm.update).toBeCalledWith(user_id, {
        current_activity_id: ActivitySequenceWithHighPriorityActivitiesDummy.activities[2].id,
        current_activity_sequence_id: ActivitySequenceWithHighPriorityActivitiesDummy.id,
        current_activity_assigned_at: expect.toBeDateString(),
        current_sequence_started_at: expect.toBeDateString(),
        current_completing_sequence_log_id: completingSequenceLogId,
        current_sequence_skipped_activities: null,
        has_received_inactivity_warning: false,
        updated_at: expect.toBeDateString(),
      });
      jest.useRealTimers();
    });

    it('positive: if user cutoff time has been reached and no high priorities remain, sequence should be completed', async () => {
      // Mock time to 6:30 PM UTC (after 6 PM cutoff)
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2022-10-06T18:30:00.000Z'));
      const activity: CreateCompletedActivityDto = {
        activity_id: ActivitySequenceWithoutHighPriorityActivitiesDummy.activities[0].id,
        quantity_logged: randomQuantity,
        duration_logged: 600,
        note_logged: 'some text',
        device_id: DeviceDummy.id,
        activity_sequence_id: ActivitySequenceWithoutHighPriorityActivitiesDummy.id,
        start_time: new Date(Date.now() - 60),
        finish_time: new Date(Date.now() - 1),
        metadata: { is_skipped: false },
      };
      const dbActivityDummy = { ...activity, activity_data: { name: 'Running' } };
      ActivitySequenceRepositoryMock.orm.findOne.mockResolvedValueOnce(
        ActivitySequenceWithoutHighPriorityActivitiesDummy,
      );
      ActivityRepositoryMock.orm.findOneBy.mockResolvedValueOnce(dbActivityDummy);
      UserRepositoryMock.orm.findOne.mockResolvedValue({
        ...userDummy,
        cutoff_time_for_non_high_priority_activities: '18:00',
        current_sequence_started_at: '2023-02-07T05:42:39.221Z',
      });
      DeviceServiceMock.markAsLeader.mockResolvedValue(LeaderDeviceDummy);
      const completingSequenceLogId = randomUUID();
      CompletedActivitySequenceServiceMock.getOrCreateCompletingSequenceLog.mockResolvedValueOnce({
        ...UncompletedSequenceLogDummy,
        activity_sequence_id: ActivitySequenceWithoutHighPriorityActivitiesDummy.id,
        id: completingSequenceLogId,
      });
      CompletedActivitySequenceServiceMock.completeActivitySequence.mockResolvedValueOnce(null);
      CompletedActivityRepositoryMock.upsertActivity.mockResolvedValueOnce({ id: randomUUID() });
      CompletedActivityRepositoryMock.orm.find.mockResolvedValueOnce([]);

      await completedActivityService.completeActivity(activity, fastifyRequestDummy.headers, { user_id });

      expect(UserRepositoryMock.orm.update).toBeCalledWith(user_id, {
        current_activity_id: null,
        current_activity_sequence_id: null,
        current_activity_assigned_at: null,
        last_completed_sequence_id: ActivitySequenceWithoutHighPriorityActivitiesDummy.id,
        last_completed_sequence_at: new Date('2022-10-06T18:30:00.000Z'),
        last_completed_sequence_started_at: '2023-02-07T05:42:39.221Z',
        current_sequence_started_at: null,
        current_completing_sequence_log_id: null,
        current_sequence_skipped_activities: null,
        has_received_inactivity_warning: false,
        updated_at: '2022-10-06T18:30:00.000Z',
      });
      jest.useRealTimers();
    });

    it('positive: if next activity in sequence is not for current day it should be skipped and following activity should be set as current', async () => {
      // mock date to be a Monday because dummy sequence has activities that should only be done on Mondays
      jest.useFakeTimers();
      jest.setSystemTime(new Date(1676874600000));
      const activity: CreateCompletedActivityDto = {
        activity_id: sequenceWithActivitiesForDifferentDays.activities[0].id,
        quantity_logged: randomQuantity,
        duration_logged: 600,
        device_id: DeviceDummy.id,
        activity_sequence_id: sequenceWithActivitiesForDifferentDays.id,
        start_time: new Date(Date.now() - 60),
        finish_time: new Date(Date.now() - 1),
      };
      const dbActivityDummy = { ...activity, activity_data: { name: 'Running' } };
      ActivitySequenceRepositoryMock.orm.findOne.mockResolvedValueOnce(sequenceWithActivitiesForDifferentDays);
      ActivityRepositoryMock.orm.findOneBy.mockResolvedValueOnce(dbActivityDummy);
      UserRepositoryMock.orm.findOne.mockResolvedValue(userDummy);
      DeviceServiceMock.markAsLeader.mockResolvedValue(LeaderDeviceDummy);
      const completingSequenceLogId = randomUUID();
      CompletedActivitySequenceServiceMock.getOrCreateCompletingSequenceLog.mockResolvedValueOnce({
        ...UncompletedSequenceLogDummy,
        activity_sequence_id: sequenceWithActivitiesForDifferentDays.id,
        id: completingSequenceLogId,
      });
      CompletedActivitySequenceServiceMock.completeActivitySequence.mockResolvedValueOnce(null);
      CompletedActivityRepositoryMock.upsertActivity.mockResolvedValueOnce({ id: randomUUID() });
      CompletedActivityRepositoryMock.orm.find.mockResolvedValueOnce([
        { activity_id: sequenceWithActivitiesForDifferentDays.activity_ids[0] },
      ]);

      await completedActivityService.completeActivity(activity, fastifyRequestDummy.headers, { user_id });

      expect(UserRepositoryMock.orm.update).toBeCalledWith(user_id, {
        current_activity_id: sequenceWithActivitiesForDifferentDays.activities[2].id,
        current_activity_sequence_id: sequenceWithActivitiesForDifferentDays.id,
        current_activity_assigned_at: expect.toBeDateString(),
        current_completing_sequence_log_id: completingSequenceLogId,
        current_sequence_skipped_activities: null,
        has_received_inactivity_warning: false,
        updated_at: expect.toBeDateString(),
      });
      jest.useRealTimers();
    });

    it("positive: if user's current sequence is from previous day, sequence should be force completed", async () => {
      // mock date to be next day according to current activity props
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2022-12-09T08:00:00.000Z'));
      const sequenceId = sequenceWhenThereIsNextActivity.id;
      ActivitySequenceRepositoryMock.orm.findOne.mockResolvedValueOnce(sequenceWhenThereIsNextActivity);
      ActivityRepositoryMock.orm.findOneBy.mockResolvedValueOnce({
        ...ActivityDummy,
        activity_sequence_id: sequenceId,
      });
      const completedSequenceLogId = randomUUID();
      const userWithCurrentActivity = new User({
        ...userDummy,
        current_activity_assigned_at: new Date('2022-12-08T13:30:00+0000'),
        current_activity_sequence_id: sequenceId,
        current_completing_sequence_log_id: completedSequenceLogId,
        current_sequence_started_at: new Date('2022-12-08T13:30:00+0000'),
      });
      UserRepositoryMock.orm.findOne
        .mockResolvedValueOnce(userWithCurrentActivity)
        .mockResolvedValueOnce(userWithCurrentActivity);
      DeviceServiceMock.markAsLeader.mockResolvedValue(LeaderDeviceDummy);
      CompletedActivitySequenceServiceMock.completeActivitySequence.mockResolvedValueOnce(null);
      const completedActivityId = randomUUID();
      CompletedActivityRepositoryMock.upsertActivity.mockResolvedValueOnce({ id: completedActivityId });
      CompletedActivityRepositoryMock.orm.find.mockResolvedValueOnce([]);
      CompletedActivitySequenceServiceMock.getOrCreateCompletingSequenceLog.mockResolvedValueOnce(
        UncompletedSequenceLogDummy,
      );

      const activityToComplete: CreateCompletedActivityDto = {
        ...completedActivity,
        activity_id: sequenceWhenThereIsNextActivity.activities[0].id,
        activity_sequence_id: sequenceId,
      };

      await completedActivityService.completeActivity(activityToComplete, fastifyRequestDummy.headers, { user_id });

      expect(CompletedActivitySequenceServiceMock.completeActivitySequence).toBeCalledWith(
        completedSequenceLogId,
        userDummy.id,
      );
      expect(CompletedActivitySequenceServiceMock.nullifyUserCurrentActivityProps).toBeCalledWith(
        userDummy.id,
        sequenceId,
        new Date('2022-12-08T13:30:00.000Z'),
      );
      jest.useRealTimers();
    });

    it("positive: if user's current sequence is from current day, sequence should NOT be force completed", async () => {
      jest.clearAllMocks();
      jest.clearAllTimers();
      jest.useFakeTimers();
      jest.setSystemTime(new Date(1670477400000));
      ActivitySequenceRepositoryMock.orm.findOne.mockResolvedValueOnce(sequenceWhenThereIsNextActivity);
      ActivityRepositoryMock.orm.findOneBy.mockResolvedValueOnce(ActivityDummy);
      const sequenceId = randomUUID();
      const completedSequenceLogId = randomUUID();
      UserRepositoryMock.orm.findOne.mockResolvedValue(
        new User({
          ...userDummy,
          current_activity_assigned_at: new Date('2022-12-08T13:30:00+0000'),
          current_activity_sequence_id: sequenceId,
          current_completing_sequence_log_id: completedSequenceLogId,
          current_sequence_started_at: new Date('2022-12-08T13:30:00+0000'),
        }),
      );
      DeviceServiceMock.markAsLeader.mockResolvedValue(LeaderDeviceDummy);
      CompletedActivitySequenceServiceMock.completeActivitySequence.mockResolvedValueOnce(null);
      const completedActivityId = randomUUID();
      CompletedActivityRepositoryMock.upsertActivity.mockResolvedValueOnce({ id: completedActivityId });
      CompletedActivityRepositoryMock.orm.find.mockResolvedValueOnce([]);
      CompletedActivitySequenceServiceMock.getOrCreateCompletingSequenceLog.mockResolvedValueOnce(
        UncompletedSequenceLogDummy,
      );

      await completedActivityService.completeActivity(completedActivity, fastifyRequestDummy.headers, { user_id });

      expect(CompletedActivitySequenceServiceMock.nullifyUserCurrentActivityProps).not.toBeCalled();
      jest.useRealTimers();
    });

    it('positive: if target activity is break type the daily stat time spent in breaks should be updated', async () => {
      ActivityDummy.type = ActivityType.break;
      ActivitySequenceRepositoryMock.orm.findOne.mockResolvedValueOnce(sequenceWhenThereIsNextActivity);
      ActivityRepositoryMock.orm.findOneBy.mockResolvedValueOnce(ActivityDummy);
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(userDummy);
      DeviceServiceMock.markAsLeader.mockResolvedValue(LeaderDeviceDummy);
      CompletedActivitySequenceServiceMock.completeActivitySequence.mockResolvedValueOnce(null);
      CompletedActivityRepositoryMock.upsertActivity.mockResolvedValueOnce({ id: randomUUID() });

      await completedActivityService.completeActivity(completedActivity, fastifyRequestDummy.headers, { user_id });

      expect(UserDailyStatsServiceMock.updateTimeSpentInBreaks).toBeCalledWith(
        userDummy.id,
        completedActivity.start_time,
        userDummy.timezone,
        completedActivity.duration_logged,
      );
    });

    it('positive: if target activity is break type the sequence check should be skipped', async () => {
      ActivityDummy.type = ActivityType.break;
      ActivitySequenceRepositoryMock.orm.findOne.mockResolvedValueOnce(sequenceWhenThereIsNextActivity);
      ActivityRepositoryMock.orm.findOneBy.mockResolvedValueOnce({ ...ActivityDummy, type: ActivityType.break });
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(userDummy);
      DeviceServiceMock.markAsLeader.mockResolvedValueOnce(LeaderDeviceDummy);
      CompletedActivitySequenceServiceMock.completeActivitySequence.mockResolvedValueOnce(null);
      CompletedActivityRepositoryMock.upsertActivity.mockResolvedValueOnce({ id: randomUUID() });

      await completedActivityService.completeActivity(completedActivity, fastifyRequestDummy.headers, { user_id });

      expect(CompletedActivityRepositoryMock.upsertActivity).toBeCalledWith(
        new CompletedActivity(
          { ...completedActivityUpsertFormat, user_id, completed_sequence_id: undefined },
          { generateId: false, log_quantity: ActivityDummy.log_quantity },
        ),
      );
    });

    it('positive: if last remaining activity in sequence for current day is completed, user current activity should be set to null', async () => {
      // mock date to be a Tuesday, dummy sequence only has one activity for Tuesday so routine should be completed after
      jest.useFakeTimers();
      jest.setSystemTime(new Date(1676961000000));
      const activity: CreateCompletedActivityDto = {
        activity_id: sequenceWithActivitiesForDifferentDays.activities[1].id,
        quantity_logged: randomQuantity,
        duration_logged: 600,
        device_id: DeviceDummy.id,
        activity_sequence_id: sequenceWithActivitiesForDifferentDays.id,
        start_time: new Date(Date.now() - 60),
        finish_time: new Date(Date.now() - 1),
      };
      const dbActivityDummy = { ...activity, activity_data: { name: 'Running' } };
      ActivitySequenceRepositoryMock.orm.findOne.mockResolvedValueOnce(sequenceWithActivitiesForDifferentDays);
      ActivityRepositoryMock.orm.findOneBy.mockResolvedValueOnce(dbActivityDummy);
      UserRepositoryMock.orm.findOne.mockResolvedValue(userDummy);
      DeviceServiceMock.markAsLeader.mockResolvedValue(LeaderDeviceDummy);
      const completingSequenceLogId = randomUUID();
      CompletedActivitySequenceServiceMock.getOrCreateCompletingSequenceLog.mockResolvedValueOnce({
        ...UncompletedSequenceLogDummy,
        activity_sequence_id: sequenceWithActivitiesForDifferentDays.id,
        id: completingSequenceLogId,
      });
      CompletedActivitySequenceServiceMock.completeActivitySequence.mockResolvedValueOnce(null);
      CompletedActivityRepositoryMock.upsertActivity.mockResolvedValueOnce({ id: randomUUID() });
      CompletedActivityRepositoryMock.orm.find.mockResolvedValueOnce([{ activity_id: activity.activity_id }]);

      await completedActivityService.completeActivity(activity, fastifyRequestDummy.headers, { user_id });

      expect(UserRepositoryMock.orm.update).toBeCalledWith(user_id, {
        current_activity_id: null,
        current_activity_sequence_id: null,
        current_activity_assigned_at: null,
        current_completing_sequence_log_id: null,
        current_sequence_skipped_activities: null,
        current_sequence_started_at: null,
        last_completed_sequence_at: new Date('2023-02-21T06:30:00.000Z'),
        last_completed_sequence_id: sequenceWithActivitiesForDifferentDays.id,
        last_completed_sequence_started_at: new Date('2023-02-21T06:30:00.000Z'),
        has_received_inactivity_warning: false,
        updated_at: '2023-02-21T06:30:00.000Z',
      });
      jest.useRealTimers();
    });

    it('positive: activity current_competency_level should be incremented if log quantity answers average is 9 or higher', async () => {
      ActivitySequenceRepositoryMock.orm.findOne.mockResolvedValueOnce(sequenceWhenThereIsNextActivity);
      ActivityRepositoryMock.orm.findOneBy.mockResolvedValueOnce(ActivityDummyWithCompetencyChoices);
      ActivityRepositoryMock.orm.find.mockResolvedValueOnce(ActivityDummyWithCompetencyChoices.choices);
      UserRepositoryMock.orm.findOne.mockResolvedValue(userDummy);
      CompletedActivityRepositoryMock.upsertActivity.mockResolvedValueOnce({ id: randomUUID() });
      CompletedActivityRepositoryMock.orm.find.mockResolvedValueOnce([]);
      CompletedActivitySequenceServiceMock.getOrCreateCompletingSequenceLog.mockResolvedValueOnce(
        UncompletedSequenceLogDummy,
      );
      LogQuantityAnswersRepositoryMock.orm.create.mockReturnValueOnce(createdLogQuantityAnswerDummies);
      LogQuantityAnswersRepositoryMock.orm.insert.mockResolvedValueOnce({
        identifiers: [{ id: createdLogQuantityAnswerDummies[0].id }, { id: createdLogQuantityAnswerDummies[1].id }],
      });
      const completedActivityWithLogQAnswers: CreateCompletedActivityDto = {
        activity_id: ActivityDummy.id,
        quantity_logged: randomQuantity,
        duration_logged: 600,
        note_logged: 'some text',
        device_id: DeviceDummy.id,
        activity_sequence_id: ActivityDummy.activity_sequence_id,
        start_time: new Date(Date.now() - 60),
        finish_time: new Date(Date.now() - 1),
        metadata: { is_skipped: false },
        log_quantity_answers: [
          { question_id: ActivityDummyWithCompetencyChoices.choices[0].id, logged_value: 9 },
          { question_id: ActivityDummyWithCompetencyChoices.choices[1].id, logged_value: 10 },
        ],
      };

      await completedActivityService.completeActivity(completedActivityWithLogQAnswers, fastifyRequestDummy.headers, {
        user_id,
      });

      expect(ActivityRepositoryMock.orm.save).toBeCalledWith({
        ...ActivityDummyWithCompetencyChoices,
        activity_data: { ...ActivityDummyWithCompetencyChoices.activity_data, current_competency_level: 2 },
      });
    });

    it('positive: activity current_competency_level should be decremented if log quantity answers average is 4 or lower', async () => {
      ActivitySequenceRepositoryMock.orm.findOne.mockResolvedValueOnce(sequenceWhenThereIsNextActivity);
      ActivityRepositoryMock.orm.findOneBy.mockResolvedValueOnce({
        ...ActivityDummyWithCompetencyChoices,
        activity_data: { ...ActivityDummyWithCompetencyChoices.activity_data, current_competency_level: 2 },
      });
      ActivityRepositoryMock.orm.find.mockResolvedValueOnce(ActivityDummyWithCompetencyChoices.choices);
      UserRepositoryMock.orm.findOne.mockResolvedValue(userDummy);
      CompletedActivityRepositoryMock.upsertActivity.mockResolvedValueOnce({ id: randomUUID() });
      CompletedActivityRepositoryMock.orm.find.mockResolvedValueOnce([]);
      CompletedActivitySequenceServiceMock.getOrCreateCompletingSequenceLog.mockResolvedValueOnce(
        UncompletedSequenceLogDummy,
      );
      LogQuantityAnswersRepositoryMock.orm.create.mockReturnValueOnce(createdLogQuantityAnswerDummies);
      LogQuantityAnswersRepositoryMock.orm.insert.mockResolvedValueOnce({
        identifiers: [{ id: createdLogQuantityAnswerDummies[0].id }, { id: createdLogQuantityAnswerDummies[1].id }],
      });
      const completedActivityWithLogQAnswers: CreateCompletedActivityDto = {
        activity_id: ActivityDummy.id,
        quantity_logged: randomQuantity,
        duration_logged: 600,
        note_logged: 'some text',
        device_id: DeviceDummy.id,
        activity_sequence_id: ActivityDummy.activity_sequence_id,
        start_time: new Date(Date.now() - 60),
        finish_time: new Date(Date.now() - 1),
        metadata: { is_skipped: false },
        log_quantity_answers: [
          { question_id: ActivityDummyWithCompetencyChoices.choices[0].id, logged_value: 4 },
          { question_id: ActivityDummyWithCompetencyChoices.choices[1].id, logged_value: 3 },
        ],
      };

      await completedActivityService.completeActivity(completedActivityWithLogQAnswers, fastifyRequestDummy.headers, {
        user_id,
      });

      expect(ActivityRepositoryMock.orm.save).toBeCalledWith({
        ...ActivityDummyWithCompetencyChoices,
        activity_data: { ...ActivityDummyWithCompetencyChoices.activity_data, current_competency_level: 1 },
      });
    });

    it('positive: activity current_competency_level should not be incremented if it is already at max level', async () => {
      const maxCompetencyLevel = 5;
      ActivitySequenceRepositoryMock.orm.findOne.mockResolvedValueOnce(sequenceWhenThereIsNextActivity);
      ActivityRepositoryMock.orm.findOneBy.mockResolvedValueOnce({
        ...ActivityDummyWithCompetencyChoices,
        activity_data: {
          ...ActivityDummyWithCompetencyChoices.activity_data,
          current_competency_level: maxCompetencyLevel,
        },
      });
      ActivityRepositoryMock.orm.find.mockResolvedValueOnce(
        Array(maxCompetencyLevel).fill(ActivityDummyWithCompetencyChoices.choices[0]),
      );
      UserRepositoryMock.orm.findOne.mockResolvedValue(userDummy);
      CompletedActivityRepositoryMock.upsertActivity.mockResolvedValueOnce({ id: randomUUID() });
      CompletedActivityRepositoryMock.orm.find.mockResolvedValueOnce([]);
      CompletedActivitySequenceServiceMock.getOrCreateCompletingSequenceLog.mockResolvedValueOnce(
        UncompletedSequenceLogDummy,
      );
      LogQuantityAnswersRepositoryMock.orm.create.mockReturnValueOnce(createdLogQuantityAnswerDummies);
      LogQuantityAnswersRepositoryMock.orm.insert.mockResolvedValueOnce({
        identifiers: [{ id: createdLogQuantityAnswerDummies[0].id }, { id: createdLogQuantityAnswerDummies[1].id }],
      });
      const completedActivityWithLogQAnswers: CreateCompletedActivityDto = {
        activity_id: ActivityDummy.id,
        quantity_logged: randomQuantity,
        duration_logged: 600,
        note_logged: 'some text',
        device_id: DeviceDummy.id,
        activity_sequence_id: ActivityDummy.activity_sequence_id,
        start_time: new Date(Date.now() - 60),
        finish_time: new Date(Date.now() - 1),
        metadata: { is_skipped: false },
        log_quantity_answers: [
          { question_id: ActivityDummyWithCompetencyChoices.choices[0].id, logged_value: 9 },
          { question_id: ActivityDummyWithCompetencyChoices.choices[1].id, logged_value: 10 },
        ],
      };

      await completedActivityService.completeActivity(completedActivityWithLogQAnswers, fastifyRequestDummy.headers, {
        user_id,
      });

      expect(ActivityRepositoryMock.orm.save).not.toBeCalled();
    });

    it('positive: activity current_competency_level should not be decremented if it is already at min level', async () => {
      ActivitySequenceRepositoryMock.orm.findOne.mockResolvedValueOnce(sequenceWhenThereIsNextActivity);
      ActivityRepositoryMock.orm.findOneBy.mockResolvedValueOnce({
        ...ActivityDummyWithCompetencyChoices,
        activity_data: { ...ActivityDummyWithCompetencyChoices.activity_data, current_competency_level: 1 },
      });
      ActivityRepositoryMock.orm.find.mockResolvedValueOnce(ActivityDummyWithCompetencyChoices.choices);
      UserRepositoryMock.orm.findOne.mockResolvedValue(userDummy);
      CompletedActivityRepositoryMock.upsertActivity.mockResolvedValueOnce({ id: randomUUID() });
      CompletedActivityRepositoryMock.orm.find.mockResolvedValueOnce([]);
      CompletedActivitySequenceServiceMock.getOrCreateCompletingSequenceLog.mockResolvedValueOnce(
        UncompletedSequenceLogDummy,
      );
      LogQuantityAnswersRepositoryMock.orm.create.mockReturnValueOnce(createdLogQuantityAnswerDummies);
      LogQuantityAnswersRepositoryMock.orm.insert.mockResolvedValueOnce({
        identifiers: [{ id: createdLogQuantityAnswerDummies[0].id }, { id: createdLogQuantityAnswerDummies[1].id }],
      });
      const completedActivityWithLogQAnswers: CreateCompletedActivityDto = {
        activity_id: ActivityDummy.id,
        quantity_logged: randomQuantity,
        duration_logged: 600,
        note_logged: 'some text',
        device_id: DeviceDummy.id,
        activity_sequence_id: ActivityDummy.activity_sequence_id,
        start_time: new Date(Date.now() - 60),
        finish_time: new Date(Date.now() - 1),
        metadata: { is_skipped: false },
        log_quantity_answers: [
          { question_id: ActivityDummyWithCompetencyChoices.choices[0].id, logged_value: 2 },
          { question_id: ActivityDummyWithCompetencyChoices.choices[1].id, logged_value: 3 },
        ],
      };

      await completedActivityService.completeActivity(completedActivityWithLogQAnswers, fastifyRequestDummy.headers, {
        user_id,
      });

      expect(ActivityRepositoryMock.orm.save).not.toBeCalled();
    });
    it('positive: should not update competency level if activity does not track it', async () => {
      ActivitySequenceRepositoryMock.orm.findOne.mockResolvedValueOnce(sequenceWhenThereIsNextActivity);
      ActivityRepositoryMock.orm.findOneBy.mockResolvedValueOnce({
        ...ActivityDummyWithCompetencyChoices,
        activity_data: { ...ActivityDummyWithCompetencyChoices.activity_data, track_competency: false },
      });
      ActivityRepositoryMock.orm.find.mockResolvedValueOnce(ActivityDummyWithCompetencyChoices.choices);
      UserRepositoryMock.orm.findOne.mockResolvedValue(userDummy);
      CompletedActivityRepositoryMock.upsertActivity.mockResolvedValueOnce({ id: randomUUID() });
      CompletedActivityRepositoryMock.orm.find.mockResolvedValueOnce([]);
      CompletedActivitySequenceServiceMock.getOrCreateCompletingSequenceLog.mockResolvedValueOnce(
        UncompletedSequenceLogDummy,
      );
      LogQuantityAnswersRepositoryMock.orm.create.mockReturnValueOnce(createdLogQuantityAnswerDummies);
      LogQuantityAnswersRepositoryMock.orm.insert.mockResolvedValueOnce({
        identifiers: [{ id: createdLogQuantityAnswerDummies[0].id }, { id: createdLogQuantityAnswerDummies[1].id }],
      });
      const completedActivityWithLogQAnswers: CreateCompletedActivityDto = {
        activity_id: ActivityDummy.id,
        quantity_logged: randomQuantity,
        duration_logged: 600,
        note_logged: 'some text',
        device_id: DeviceDummy.id,
        activity_sequence_id: ActivityDummy.activity_sequence_id,
        start_time: new Date(Date.now() - 60),
        finish_time: new Date(Date.now() - 1),
        metadata: { is_skipped: false },
        log_quantity_answers: [
          { question_id: ActivityDummyWithCompetencyChoices.choices[0].id, logged_value: 9 },
          { question_id: ActivityDummyWithCompetencyChoices.choices[1].id, logged_value: 10 },
        ],
      };

      await completedActivityService.completeActivity(completedActivityWithLogQAnswers, fastifyRequestDummy.headers, {
        user_id,
      });

      expect(ActivityRepositoryMock.orm.save).not.toBeCalled();
    });
    it('positive: next activity should be set to first activity that has not been completed yet rather than next activity in sequence', async () => {
      // mock date to be a Monday because dummy sequence has activities that should only be done on Mondays
      jest.useFakeTimers();
      jest.setSystemTime(new Date(1676874600000));
      const activity: CreateCompletedActivityDto = {
        activity_id: sequenceWithActivitiesForDifferentDays.activities[2].id,
        quantity_logged: randomQuantity,
        duration_logged: 600,
        device_id: DeviceDummy.id,
        activity_sequence_id: sequenceWithActivitiesForDifferentDays.id,
        start_time: new Date(Date.now() - 60),
        finish_time: new Date(Date.now() - 1),
      };
      const dbActivityDummy = { ...activity, activity_data: { name: 'Running' } };
      ActivitySequenceRepositoryMock.orm.findOne.mockResolvedValueOnce(sequenceWithActivitiesForDifferentDays);
      ActivityRepositoryMock.orm.findOneBy.mockResolvedValueOnce(dbActivityDummy);
      UserRepositoryMock.orm.findOne.mockResolvedValue(userDummy);
      DeviceServiceMock.markAsLeader.mockResolvedValue(LeaderDeviceDummy);
      const completingSequenceLogId = randomUUID();
      CompletedActivitySequenceServiceMock.getOrCreateCompletingSequenceLog.mockResolvedValueOnce({
        ...UncompletedSequenceLogDummy,
        activity_sequence_id: sequenceWithActivitiesForDifferentDays.id,
        id: completingSequenceLogId,
      });
      CompletedActivitySequenceServiceMock.completeActivitySequence.mockResolvedValueOnce(null);
      CompletedActivityRepositoryMock.upsertActivity.mockResolvedValueOnce({ id: randomUUID() });
      CompletedActivityRepositoryMock.orm.find.mockResolvedValueOnce([]);

      await completedActivityService.completeActivity(activity, fastifyRequestDummy.headers, { user_id });

      expect(UserRepositoryMock.orm.update).toBeCalledWith(user_id, {
        current_activity_id: sequenceWithActivitiesForDifferentDays.activities[0].id,
        current_activity_sequence_id: sequenceWithActivitiesForDifferentDays.id,
        current_activity_assigned_at: new Date('2023-02-20T06:30:00.000Z'),
        current_completing_sequence_log_id: completingSequenceLogId,
        current_sequence_skipped_activities: null,
        current_sequence_started_at: new Date('2023-02-20T06:29:59.940Z'),
        has_received_inactivity_warning: false,
        updated_at: '2023-02-20T06:30:00.000Z',
      });
      jest.useRealTimers();
    });
  });

  describe('skipActivity', () => {
    const completedActivity: CreateCompletedActivityDto = {
      activity_id: ActivityDummy.id,
      quantity_logged: randomInt(20),
      duration_logged: 600,
      note_logged: 'some text',
      device_id: DeviceDummy.id,
      activity_sequence_id: ActivityDummy.activity_sequence_id,
      start_time: new Date(Date.now() - 60),
      finish_time: new Date(Date.now() - 1),
    };

    const user_id = userDummy.id;

    const sequenceWhenThereIsNextActivity = new ActivitySequence({
      ...ActivitySequenceDummy,
      activity_ids: [completedActivity.activity_id, ...ActivitySequenceDummy.activity_ids],
      activities: [
        new Activity({
          id: completedActivity.activity_id,
          activity_sequence_id: ActivitySequenceDummy.id,
          days_of_week: [DaysOfWeek.ALL],
        }),
        new Activity({
          id: ActivitySequenceDummy.activity_ids[0],
          activity_sequence_id: ActivitySequenceDummy.id,
          days_of_week: [DaysOfWeek.ALL],
        }),
      ],
    });

    const sequenceWhenThereIsNoNextActivity = new ActivitySequence({
      ...ActivitySequenceDummy,
      activity_ids: [...ActivitySequenceDummy.activity_ids, completedActivity.activity_id],
      activities: ActivitiesArrayDummy.morning_activities.map((activity) => ({ ...activity, tutorial: undefined })),
    });

    it('positive: the target device should be marked as leader', async () => {
      ActivitySequenceRepositoryMock.orm.findOne.mockResolvedValueOnce(sequenceWhenThereIsNextActivity);
      ActivityRepositoryMock.orm.findOneBy.mockResolvedValueOnce(ActivityDummy);
      const user = { ...userDummy, current_sequence_skipped_activities: [randomUUID()] };
      UserRepositoryMock.orm.findOne.mockResolvedValue(user);
      CompletedActivityRepositoryMock.create.mockResolvedValueOnce({ id: randomUUID() });
      CompletedActivityRepositoryMock.orm.find.mockResolvedValueOnce([]);
      CompletedActivitySequenceServiceMock.getOrCreateCompletingSequenceLog.mockResolvedValueOnce(
        UncompletedSequenceLogDummy,
      );
      CompletedActivityRepositoryMock.upsertActivity.mockResolvedValueOnce({ id: randomUUID() });

      await completedActivityService.skipActivity(completedActivity, { user_id });

      expect(DeviceServiceMock.markAsLeader).toBeCalledWith(completedActivity.device_id, user_id);
    });

    it('positive: if there is the next activity in the sequence, its id should be set as current_activity_id for the given User', async () => {
      const previousSkippedId = randomUUID();
      ActivitySequenceRepositoryMock.orm.findOne.mockResolvedValueOnce(sequenceWhenThereIsNextActivity);
      ActivityRepositoryMock.orm.findOneBy.mockResolvedValueOnce(ActivityDummy);
      const user = {
        ...userDummy,
        current_sequence_skipped_activities: [previousSkippedId],
        current_sequence_started_at: new Date().toISOString(),
      };
      UserRepositoryMock.orm.findOne.mockResolvedValue(user);
      CompletedActivityRepositoryMock.create.mockResolvedValueOnce({ id: randomUUID() });
      CompletedActivityRepositoryMock.orm.find.mockResolvedValueOnce([
        { activity_id: sequenceWhenThereIsNextActivity.activity_ids[0] },
      ]);
      CompletedActivitySequenceServiceMock.getOrCreateCompletingSequenceLog.mockResolvedValueOnce(
        UncompletedSequenceLogDummy,
      );
      CompletedActivityRepositoryMock.upsertActivity.mockResolvedValueOnce({ id: randomUUID() });

      await completedActivityService.skipActivity(completedActivity, { user_id });

      expect(UserRepositoryMock.orm.update).toBeCalledWith(user_id, {
        current_activity_id: sequenceWhenThereIsNextActivity.activity_ids[1],
        current_activity_sequence_id: sequenceWhenThereIsNextActivity.id,
        current_activity_assigned_at: expect.toBeDateString(),
        current_completing_sequence_log_id: UncompletedSequenceLogDummy.id,
        current_sequence_skipped_activities: [previousSkippedId, completedActivity.activity_id],
        has_received_inactivity_warning: false,
        updated_at: expect.toBeDateString(),
      });
    });

    it('positive: if there is no next activity in the sequence, current_activity_id should be set NULL for the given User', async () => {
      const previousSkippedId = randomUUID();
      const userWithCurrentActivity: User = {
        ...userDummy,
        current_activity_id: completedActivity.activity_id,
        current_activity_sequence_id: completedActivity.activity_sequence_id,
        current_sequence_started_at: new Date(),
        current_sequence_skipped_activities: [previousSkippedId],
      };
      ActivitySequenceRepositoryMock.orm.findOne.mockResolvedValueOnce(sequenceWhenThereIsNoNextActivity);
      ActivityRepositoryMock.orm.findOneBy.mockResolvedValueOnce(ActivityDummy);
      UserRepositoryMock.orm.findOne.mockResolvedValue(userWithCurrentActivity);
      CompletedActivitySequenceServiceMock.completeActivitySequence.mockResolvedValueOnce(null);
      CompletedActivityRepositoryMock.create.mockResolvedValueOnce({ id: randomUUID() });
      CompletedActivityRepositoryMock.orm.find.mockResolvedValueOnce([{ activity_id: randomUUID() }]);
      CompletedActivitySequenceServiceMock.getOrCreateCompletingSequenceLog.mockResolvedValueOnce(
        UncompletedSequenceLogDummy,
      );
      CompletedActivityRepositoryMock.upsertActivity.mockResolvedValueOnce({ id: randomUUID() });

      await completedActivityService.skipActivity(completedActivity, { user_id });

      expect(UserRepositoryMock.orm.update).toBeCalledWith(user_id, {
        current_activity_id: null,
        current_activity_sequence_id: null,
        current_activity_assigned_at: null,
        last_completed_sequence_id: userWithCurrentActivity.current_activity_sequence_id,
        last_completed_sequence_at: expect.toBeDate(),
        current_sequence_started_at: null,
        last_completed_sequence_started_at: expect.toBeDate(),
        current_completing_sequence_log_id: null,
        current_sequence_skipped_activities: [previousSkippedId, completedActivity.activity_id],
        has_received_inactivity_warning: false,
        updated_at: expect.toBeDateString(),
      });
    });

    it('positive: completed activity log should be saved with metadata field indicating that the activity was skipped', async () => {
      const previousSkippedId = randomUUID();
      const userWithCurrentActivity: User = {
        ...userDummy,
        current_activity_id: completedActivity.activity_id,
        current_activity_sequence_id: completedActivity.activity_sequence_id,
        current_sequence_started_at: new Date(),
        current_sequence_skipped_activities: [previousSkippedId],
      };
      ActivitySequenceRepositoryMock.orm.findOne.mockResolvedValueOnce(sequenceWhenThereIsNoNextActivity);
      ActivityRepositoryMock.orm.findOneBy.mockResolvedValueOnce(ActivityDummy);
      UserRepositoryMock.orm.findOne.mockResolvedValue(userWithCurrentActivity);
      CompletedActivitySequenceServiceMock.completeActivitySequence.mockResolvedValueOnce(null);
      CompletedActivityRepositoryMock.create.mockResolvedValueOnce({ id: randomUUID() });
      CompletedActivityRepositoryMock.orm.find.mockResolvedValueOnce([]);
      CompletedActivitySequenceServiceMock.getOrCreateCompletingSequenceLog.mockResolvedValueOnce(
        UncompletedSequenceLogDummy,
      );
      CompletedActivityRepositoryMock.upsertActivity.mockResolvedValueOnce({ id: randomUUID() });
      const updatedCompletedActivity = {
        id: undefined,
        activity_id: completedActivity.activity_id,
        quantity_logged: completedActivity.quantity_logged,
        duration_logged: completedActivity.duration_logged,
        activity_sequence_id: completedActivity.activity_sequence_id,
        start_time: completedActivity.start_time,
        finish_time: completedActivity.finish_time,
        metadata: { skipped_did_not_complete: true },
        user_id: userDummy.id,
        completed_sequence_id: undefined,
        activity_note: completedActivity.note_logged,
      };

      await completedActivityService.skipActivity(
        { ...completedActivity, metadata: { skipped_did_not_complete: true } },
        { user_id },
      );

      expect(CompletedActivityRepositoryMock.upsertActivity).toBeCalledWith(updatedCompletedActivity);
    });

    it('positive: if client passes skipped_did_complete, service should respect it and treat as completion in guard later', async () => {
      const userWithCurrentActivity: User = {
        ...userDummy,
        current_activity_id: completedActivity.activity_id,
        current_activity_sequence_id: completedActivity.activity_sequence_id,
        current_sequence_started_at: new Date(),
      };
      ActivitySequenceRepositoryMock.orm.findOne.mockResolvedValueOnce(sequenceWhenThereIsNoNextActivity);
      ActivityRepositoryMock.orm.findOneBy.mockResolvedValueOnce(ActivityDummy);
      UserRepositoryMock.orm.findOne.mockResolvedValue(userWithCurrentActivity);
      CompletedActivitySequenceServiceMock.completeActivitySequence.mockResolvedValueOnce(null);
      CompletedActivityRepositoryMock.create.mockResolvedValueOnce({ id: randomUUID() });
      CompletedActivityRepositoryMock.orm.find.mockResolvedValueOnce([]);
      CompletedActivitySequenceServiceMock.getOrCreateCompletingSequenceLog.mockResolvedValueOnce(
        UncompletedSequenceLogDummy,
      );
      CompletedActivityRepositoryMock.upsertActivity.mockResolvedValueOnce({ id: randomUUID() });

      await completedActivityService.skipActivity(
        { ...completedActivity, metadata: { skipped_did_complete: true } },
        { user_id },
      );

      expect(CompletedActivityRepositoryMock.upsertActivity).toBeCalledWith(
        expect.objectContaining({ metadata: { skipped_did_complete: true } }),
      );
    });
  });

  describe('getStatsByActivityPerDay', () => {
    const params = {
      activity_id: ActivityDummy.id,
    };

    const query = {
      days_number: 30,
      timezone: 'UTC',
    };

    it('negative: should throw NotFoundException if activity does not exist', async () => {
      ActivityRepositoryMock.orm.findOneBy.mockResolvedValueOnce(null);
      const errorMessage = `Activity with id: ${params.activity_id} does not exist!`;
      let exception: any;

      try {
        await completedActivityService.getStatsByActivityPerDay(params, query);
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('positive: if log_quantity set to false, stat_type value should be "duration"', async () => {
      const activityWithFalsyQuantityLogs: Activity = {
        ...ActivityDummy,
        log_quantity: false,
        linked_activity_id: null,
      };
      ActivityRepositoryMock.orm.findOneBy.mockResolvedValueOnce(activityWithFalsyQuantityLogs);
      ActivityRepositoryMock.orm.find.mockResolvedValueOnce([]);
      LogQuantityQuestionsRepositoryMock.orm.find.mockResolvedValueOnce([]);

      await completedActivityService.getStatsByActivityPerDay(params, query);

      expect(CompletedActivityRepositoryMock.getAggregatedQuantityLogsPerDay).toBeCalledWith(
        [params.activity_id, null],
        {
          ...query,
          log_summary_type: activityWithFalsyQuantityLogs.log_summary_type,
          stat_type: ActivityStatType.duration,
        },
      );
    });

    it('positive: if log_quantity set to true, stat_type value should be "quantity"', async () => {
      const activityWithTruthyQuantityLogs: Activity = {
        ...ActivityDummy,
        log_quantity: true,
        linked_activity_id: null,
      };
      ActivityRepositoryMock.orm.findOneBy.mockResolvedValueOnce(activityWithTruthyQuantityLogs);
      ActivityRepositoryMock.orm.find.mockResolvedValueOnce([]);
      LogQuantityQuestionsRepositoryMock.orm.find.mockResolvedValueOnce([]);

      await completedActivityService.getStatsByActivityPerDay(params, query);

      expect(CompletedActivityRepositoryMock.getAggregatedQuantityLogsPerDay).toBeCalledWith(
        [params.activity_id, null],
        {
          ...query,
          log_summary_type: activityWithTruthyQuantityLogs.log_summary_type,
          stat_type: ActivityStatType.quantity,
        },
      );
    });

    it('positive: should return instance of CompletedActivityStats', async () => {
      ActivityRepositoryMock.orm.findOneBy.mockResolvedValueOnce(ActivityDummy);
      const statItemsDummy = [{ date: new Date(Date.now()), summary: '30' }];
      CompletedActivityRepositoryMock.getAggregatedQuantityLogsPerDay.mockResolvedValueOnce(statItemsDummy);
      ActivityRepositoryMock.orm.find.mockResolvedValueOnce([]);
      LogQuantityQuestionsRepositoryMock.orm.find.mockResolvedValueOnce([]);

      const result = await completedActivityService.getStatsByActivityPerDay(params, query);

      expect(result).toBeDefined();
      expect(result).toBeInstanceOf(CompletedActivityStats);
    });

    it('positive: if activity has log quantity questions, stats for them should be retrieved and included in response', async () => {
      const activityWithFalsyQuantityLogs: Activity = {
        ...ActivityDummy,
        log_quantity: false,
        linked_activity_id: null,
      };
      ActivityRepositoryMock.orm.findOneBy.mockResolvedValueOnce(activityWithFalsyQuantityLogs);
      ActivityRepositoryMock.orm.find.mockResolvedValueOnce([]);
      const questionOneId = randomUUID();
      LogQuantityQuestionsRepositoryMock.orm.find.mockResolvedValueOnce([{ id: questionOneId }]);
      LogQuantityAnswersRepositoryMock.orm.findOneBy.mockResolvedValueOnce({ id: questionOneId });
      LogQuantityQuestionsRepositoryMock.orm.find.mockResolvedValueOnce([]);
      LogQuantityAnswersRepositoryMock.getAggregatedQuantityLogsPerDay.mockResolvedValueOnce({
        date: new Date(),
        summary: 5,
      });

      const result = await completedActivityService.getStatsByActivityPerDay(params, query);

      expect(result).toBeInstanceOf(CompletedActivityStats);
      expect(result.log_quantity_answers_stats.length).toBe(1);
      expect(result.log_quantity_answers_stats[0]).toBeInstanceOf(LogQuantityAnswersStats);
    });
    it('positive: should include linked_activity_id in query if it exists', async () => {
      const linkedActivityId = randomUUID();
      const activityWithLinkedId: Activity = {
        ...ActivityDummy,
        log_quantity: true,
        linked_activity_id: linkedActivityId,
      };
      ActivityRepositoryMock.orm.findOneBy.mockResolvedValueOnce(activityWithLinkedId);
      ActivityRepositoryMock.orm.find.mockResolvedValueOnce([]);
      LogQuantityQuestionsRepositoryMock.orm.find.mockResolvedValueOnce([]);

      await completedActivityService.getStatsByActivityPerDay(params, query);

      expect(CompletedActivityRepositoryMock.getAggregatedQuantityLogsPerDay).toBeCalledWith(
        [params.activity_id, linkedActivityId],
        {
          ...query,
          log_summary_type: activityWithLinkedId.log_summary_type,
          stat_type: ActivityStatType.quantity,
        },
      );
    });
  });

  describe('getCompletedLogsByActivityInTimeRange', () => {
    it('positive: repository query should be called', async () => {
      const activity_id = randomUUID();
      const timeRange = { from_time: new Date(), to_time: new Date() };
      await completedActivityService.getCompletedLogsByActivityInTimeRange({ activity_id }, timeRange);

      expect(CompletedActivityRepositoryMock.getLogsByActivityInTimeRange).toBeCalledWith(activity_id, timeRange);
    });
  });

  describe('reviseCompletedLog', () => {
    const quantity_logged = 113;

    it('negative: should throw NotFoundException if activity does not exist', async () => {
      const id = randomUUID();
      CompletedActivityRepositoryMock.orm.findOneBy.mockResolvedValue(null);
      let exception: any;

      try {
        await completedActivityService.reviseCompletedLog(id, { quantity_logged });
      } catch (error) {
        exception = error;
      }

      const errorMessage = `Completed log with id: ${id} does not exist!`;
      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('positive: quantity_logged value should be reassigned and the updated item saved', async () => {
      CompletedActivityRepositoryMock.orm.findOneBy.mockResolvedValue(CompletedActivityDummy);

      await completedActivityService.reviseCompletedLog(CompletedActivityDummy.id, { quantity_logged });

      const updatedItem = { ...CompletedActivityDummy, quantity_logged };
      expect(CompletedActivityRepositoryMock.orm.save).toBeCalledWith(updatedItem);
    });

    it('positive: if log_quantity_answers are sent they should be updated', async () => {
      CompletedActivityRepositoryMock.orm.findOneBy.mockResolvedValueOnce(CompletedActivityDummy);
      LogQuantityAnswersRepositoryMock.orm.findOneBy.mockResolvedValueOnce({
        ...logQuantityAnswerDummy,
        question_id: logQuantityAnswersDtoDummy[0].question_id,
      });

      await completedActivityService.reviseCompletedLog(CompletedActivityDummy.id, {
        quantity_logged,
        log_quantity_answers: [logQuantityAnswersDtoDummy[0]],
      });

      expect(LogQuantityAnswersRepositoryMock.orm.save).toBeCalled();

      expect(LogQuantityAnswersRepositoryMock.orm.save).toBeCalledWith({
        ...logQuantityAnswerDummy,
        question_id: logQuantityAnswersDtoDummy[0].question_id,
        logged_value: logQuantityAnswersDtoDummy[0].logged_value,
      });
    });

    it('positive: should not update log quantity answer if it is not found', async () => {
      CompletedActivityRepositoryMock.orm.findOneBy.mockResolvedValue(CompletedActivityDummy);
      LogQuantityAnswersRepositoryMock.orm.findOneBy.mockResolvedValue(null);

      await completedActivityService.reviseCompletedLog(CompletedActivityDummy.id, {
        log_quantity_answers: [logQuantityAnswersDtoDummy[0]],
      });

      expect(LogQuantityAnswersRepositoryMock.orm.save).not.toBeCalled();
    });
  });

  describe('getDaySummary', () => {
    it('negative: should throw NotFoundException if user does not exist', async () => {
      const user_id = randomUUID();
      UserRepositoryMock.orm.findOneBy.mockResolvedValue(null);
      UserServiceMock.isVerboseLoggingAllowed.mockResolvedValueOnce({ isVerboseLoggingAllowed: true });
      let exception: any;

      try {
        await completedActivityService.getDaySummary(user_id, 'UTC');
      } catch (error) {
        exception = error;
      }

      const errorMessage = `User with id: ${user_id} does not exist!`;
      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('negative: should throw BadRequestException if user has no startup_time value specified', async () => {
      const testUser = { ...userDummy, startup_time: null };
      UserRepositoryMock.orm.findOneBy.mockResolvedValue(testUser);
      UserServiceMock.isVerboseLoggingAllowed.mockResolvedValueOnce({ isVerboseLoggingAllowed: true });
      let exception: any;

      try {
        await completedActivityService.getDaySummary(testUser.id, 'UTC');
      } catch (error) {
        exception = error;
      }

      const errorMessage = 'The user has no startup_time setting specified!';
      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(BadRequestException);
      expect(exception.message).toEqual(errorMessage);
    });
  });

  describe('buildTimestamp', () => {
    afterEach(() => {
      jest.clearAllMocks();
    });
    it('negative: should throw error because of invalid timezone', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValue(userDummy);
      CompletedFocusBlockRepositoryMock.getLogsByUserInTimeRange.mockResolvedValue([CompletedFocusBlockDummy]);
      CompletedActivityRepositoryMock.getDaySummaryAVG.mockResolvedValue([CompletedActivityDummy]);
      CompletedActivityRepositoryMock.getDaySummarySUM.mockResolvedValue([CompletedActivityDummy]);
      CompletedActivityRepositoryMock.getDaySummaryDuration.mockResolvedValue([CompletedActivityDummy]);
      UserServiceMock.isVerboseLoggingAllowed.mockResolvedValueOnce({ isVerboseLoggingAllowed: true });
      let exception: any;

      try {
        await completedActivityService.getDaySummary(userDummy.id, '...');
      } catch (error) {
        exception = error;
      }
      expect(exception).toBeInstanceOf(BadRequestException);
      expect(exception.message).toEqual('Invalid timezone: ...');
    });

    it('positive: aggregation queries should be called with a correct time range', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValue(userDummy);
      CompletedFocusBlockRepositoryMock.getLogsByUserInTimeRange.mockResolvedValue([CompletedFocusBlockDummy]);
      CompletedActivityRepositoryMock.getDaySummaryAVG.mockResolvedValue([CompletedActivityDummy]);
      CompletedActivityRepositoryMock.getDaySummarySUM.mockResolvedValue([CompletedActivityDummy]);
      CompletedActivityRepositoryMock.getDaySummaryDuration.mockResolvedValue([CompletedActivityDummy]);
      UserServiceMock.isVerboseLoggingAllowed.mockResolvedValueOnce({ isVerboseLoggingAllowed: true });

      await completedActivityService.getDaySummary(userDummy.id, 'UTC');

      const timerange = { from_time: expect.toBeDateString(), to_time: expect.toBeDateString() };
      expect(CompletedFocusBlockRepositoryMock.getLogsByUserInTimeRange).toBeCalledWith(userDummy.id, timerange);
      expect(CompletedActivityRepositoryMock.getDaySummaryAVG).toBeCalledWith(userDummy.id, timerange);
      expect(CompletedActivityRepositoryMock.getDaySummarySUM).toBeCalledWith(userDummy.id, timerange);
      expect(CompletedActivityRepositoryMock.getDaySummaryDuration).toBeCalledWith(userDummy.id, timerange);
    });

    it('positive: should return DaySummary data model', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValue(userDummy);
      CompletedFocusBlockRepositoryMock.getLogsByUserInTimeRange.mockResolvedValue([CompletedFocusBlockDummy]);
      CompletedActivityRepositoryMock.getDaySummaryAVG.mockResolvedValue([CompletedActivityDummy]);
      CompletedActivityRepositoryMock.getDaySummarySUM.mockResolvedValue([CompletedActivityDummy]);
      CompletedActivityRepositoryMock.getDaySummaryDuration.mockResolvedValue([CompletedActivityDummy]);
      UserServiceMock.isVerboseLoggingAllowed.mockResolvedValueOnce({ isVerboseLoggingAllowed: true });

      const result = await completedActivityService.getDaySummary(userDummy.id, 'UTC');

      expect(result).toBeInstanceOf(DaySummary);
    });

    it('positive: should return DaySummary with current time between 24:00 and 01:00 (test previous error)', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(1665448200000));
      const timerange = { from_time: '2022-10-11T06:15:00.000Z', to_time: '2022-10-11T00:30:00.000Z' };

      UserRepositoryMock.orm.findOneBy.mockResolvedValue(userDummy);
      CompletedFocusBlockRepositoryMock.getLogsByUserInTimeRange.mockResolvedValue([CompletedFocusBlockDummy]);
      CompletedActivityRepositoryMock.getDaySummaryAVG.mockResolvedValue([CompletedActivityDummy]);
      CompletedActivityRepositoryMock.getDaySummarySUM.mockResolvedValue([CompletedActivityDummy]);
      CompletedActivityRepositoryMock.getDaySummaryDuration.mockResolvedValue([CompletedActivityDummy]);
      UserServiceMock.isVerboseLoggingAllowed.mockResolvedValueOnce({ isVerboseLoggingAllowed: true });
      const result = await completedActivityService.getDaySummary(userDummy.id, 'UTC');

      expect(result).toBeInstanceOf(DaySummary);
      expect(CompletedFocusBlockRepositoryMock.getLogsByUserInTimeRange).toBeCalledWith(userDummy.id, timerange);
      jest.useRealTimers();
    });

    it('positive: should return DaySummary with timezone unsupported by .toISOString (test previous error)', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(1667248935000));
      const timerange = { from_time: '2022-10-31T09:15:00.000Z', to_time: '2022-10-31T20:42:15.000Z' };
      UserRepositoryMock.orm.findOneBy.mockResolvedValue(userDummy);
      CompletedFocusBlockRepositoryMock.getLogsByUserInTimeRange.mockResolvedValue([CompletedFocusBlockDummy]);
      CompletedActivityRepositoryMock.getDaySummaryAVG.mockResolvedValue([CompletedActivityDummy]);
      CompletedActivityRepositoryMock.getDaySummarySUM.mockResolvedValue([CompletedActivityDummy]);
      CompletedActivityRepositoryMock.getDaySummaryDuration.mockResolvedValue([CompletedActivityDummy]);
      UserServiceMock.isVerboseLoggingAllowed.mockResolvedValueOnce({ isVerboseLoggingAllowed: true });
      const result = await completedActivityService.getDaySummary(userDummy.id, 'America/Moncton');

      expect(result).toBeInstanceOf(DaySummary);
      expect(CompletedFocusBlockRepositoryMock.getLogsByUserInTimeRange).toBeCalledWith(userDummy.id, timerange);
      jest.useRealTimers();
    });
  });

  describe('completeMultipleActivities', () => {
    beforeEach(() => {
      jest.resetAllMocks();
      jest.clearAllMocks();
    });

    it('Negative: should throw not found exception if no user is found', async () => {
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(null);
      const errorMessage = `User with id: ${userDummy.id} does not exist!`;
      let exception: any;

      try {
        await completedActivityService.completeMultipleActivities(
          [completedActivitiesArrayDummy[0], completedActivitiesArrayDummy[1]],
          {
            user_id: userDummy.id,
          },
        );
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('Positive: should save completed activities and return empty array if no errors', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      ActivitySequenceRepositoryMock.orm.findOneBy.mockResolvedValueOnce(MorningActivitySequenceDummy);
      ActivityRepositoryMock.orm.find.mockResolvedValue(ActivitiesArrayDummy.morning_activities);
      CompletedActivitySequenceServiceMock.getOrCreateCompletingSequenceLogForSyncing.mockResolvedValue({
        ...UncompletedSequenceLogDummy,
        activity_sequence_id: MorningActivitySequenceDummy.id,
      });
      CompletedActivityRepositoryMock.upsertActivity
        .mockResolvedValueOnce({ id: '1b9fa7be-0cef-4554-bac3-1190705ea08b' })
        .mockResolvedValueOnce({ id: '1d39fa59-3ca2-4252-ab9a-affa41634634' });
      CompletedActivityRepositoryMock.orm.find.mockResolvedValueOnce([]);
      ActivityRepositoryMock.orm.find.mockResolvedValueOnce([
        {
          id: completedActivitiesArrayDummy[0].activity_id,
          activity_sequence_id: completedActivitiesArrayDummy[0].activity_sequence_id,
        },
        {
          id: completedActivitiesArrayDummy[1].activity_id,
          activity_sequence_id: completedActivitiesArrayDummy[1].activity_sequence_id,
        },
      ]);

      const result = await completedActivityService.completeMultipleActivities(
        [completedActivitiesArrayDummy[0], completedActivitiesArrayDummy[1]],
        {
          user_id: userDummy.id,
        },
      );

      expect(result).toBeArray();
      expect(result.length).toBe(0);
    });

    it('Positive: should return array of activities that failed to save', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      ActivitySequenceRepositoryMock.orm.findOne.mockResolvedValueOnce(MorningActivitySequenceDummy);
      ActivityRepositoryMock.orm.find.mockResolvedValue(ActivitiesArrayDummy.morning_activities);
      CompletedActivitySequenceServiceMock.getOrCreateCompletingSequenceLogForSyncing.mockRejectedValue(
        new NotFoundException('Throwing for test'),
      );
      CompletedActivityRepositoryMock.upsertActivity
        .mockResolvedValueOnce({ id: '1b9fa7be-0cef-4554-bac3-1190705ea08b' })
        .mockResolvedValueOnce({ id: '1d39fa59-3ca2-4252-ab9a-affa41634634' });
      ActivityRepositoryMock.orm.find.mockResolvedValueOnce([
        {
          id: completedActivitiesArrayDummy[0].activity_id,
          activity_sequence_id: completedActivitiesArrayDummy[0].activity_sequence_id,
        },
      ]);

      const result = await completedActivityService.completeMultipleActivities([completedActivitiesArrayDummy[0]], {
        user_id: userDummy.id,
      });

      expect(result).toBeArray();
      expect(result[0]).toStrictEqual(completedActivitiesArrayDummy[0]);
    });

    it('Positive: should fetch sequence for each sequence activities are from (case with activities from 2 different sequences)', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      ActivitySequenceRepositoryMock.orm.findOne
        .mockResolvedValueOnce(MorningActivitySequenceDummy)
        .mockResolvedValueOnce(EveningActivitySequenceDummy);
      ActivityRepositoryMock.orm.find.mockResolvedValueOnce([
        {
          id: completedActivitiesArrayDummy[0].activity_id,
          activity_sequence_id: completedActivitiesArrayDummy[0].activity_sequence_id,
        },
        {
          id: completedActivitiesArrayDummy[1].activity_id,
          activity_sequence_id: completedActivitiesArrayDummy[1].activity_sequence_id,
        },
        {
          id: completedActivitiesArrayDummy[2].activity_id,
          activity_sequence_id: completedActivitiesArrayDummy[2].activity_sequence_id,
        },
      ]);
      ActivityRepositoryMock.orm.find
        .mockResolvedValueOnce(ActivitiesArrayDummy.morning_activities)
        .mockResolvedValueOnce(ActivitiesArrayDummy.evening_activities);
      CompletedActivitySequenceServiceMock.getOrCreateCompletingSequenceLogForSyncing.mockResolvedValue({
        ...UncompletedSequenceLogDummy,
        activity_sequence_id: MorningActivitySequenceDummy.id,
      });
      CompletedActivityRepositoryMock.upsertActivity
        .mockResolvedValueOnce({ id: randomUUID() })
        .mockResolvedValueOnce({ id: randomUUID() });
      CompletedActivityRepositoryMock.orm.find.mockResolvedValueOnce([]);

      await completedActivityService.completeMultipleActivities(
        [completedActivitiesArrayDummy[0], completedActivitiesArrayDummy[1], completedActivitiesArrayDummy[2]],
        {
          user_id: userDummy.id,
        },
      );

      expect(ActivitySequenceRepositoryMock.orm.findOne).toBeCalledWith({
        where: { id: MorningActivitySequenceDummy.id },
        relations: ['activities'],
      });
      expect(ActivitySequenceRepositoryMock.orm.findOne).toBeCalledWith({
        where: { id: EveningActivitySequenceDummy.id },
        relations: ['activities'],
      });
    });

    it('Positive: should fetch activities for each sequence activities belong to', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      ActivitySequenceRepositoryMock.orm.findOne
        .mockResolvedValueOnce(MorningActivitySequenceDummy)
        .mockResolvedValueOnce(EveningActivitySequenceDummy);
      ActivityRepositoryMock.orm.find.mockResolvedValueOnce([
        {
          id: completedActivitiesArrayDummy[0].activity_id,
          activity_sequence_id: completedActivitiesArrayDummy[0].activity_sequence_id,
        },
        {
          id: completedActivitiesArrayDummy[1].activity_id,
          activity_sequence_id: completedActivitiesArrayDummy[1].activity_sequence_id,
        },
        {
          id: completedActivitiesArrayDummy[2].activity_id,
          activity_sequence_id: completedActivitiesArrayDummy[2].activity_sequence_id,
        },
      ]);
      ActivityRepositoryMock.orm.find
        .mockResolvedValueOnce(ActivitiesArrayDummy.morning_activities)
        .mockResolvedValueOnce(ActivitiesArrayDummy.evening_activities);
      CompletedActivitySequenceServiceMock.getOrCreateCompletingSequenceLogForSyncing.mockResolvedValue({
        ...UncompletedSequenceLogDummy,
        activity_sequence_id: MorningActivitySequenceDummy.id,
      });
      CompletedActivityRepositoryMock.upsertActivity
        .mockResolvedValueOnce({ id: randomUUID() })
        .mockResolvedValueOnce({ id: randomUUID() });
      CompletedActivityRepositoryMock.orm.find.mockResolvedValueOnce([]);

      await completedActivityService.completeMultipleActivities(
        [completedActivitiesArrayDummy[0], completedActivitiesArrayDummy[1], completedActivitiesArrayDummy[2]],
        {
          user_id: userDummy.id,
        },
      );

      expect(ActivityRepositoryMock.orm.find).toBeCalledWith({
        where: { activity_sequence_id: MorningActivitySequenceDummy.id, user_id: userDummy.id },
      });
      expect(ActivityRepositoryMock.orm.find).toBeCalledWith({
        where: { activity_sequence_id: EveningActivitySequenceDummy.id, user_id: userDummy.id },
      });
    });

    it('Positive: should create completed log for each activity in array (array has 3 completed activities)', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      ActivitySequenceRepositoryMock.orm.findOne
        .mockResolvedValueOnce(MorningActivitySequenceDummy)
        .mockResolvedValueOnce(EveningActivitySequenceDummy);
      ActivityRepositoryMock.orm.find.mockResolvedValueOnce([
        {
          id: completedActivitiesArrayDummy[0].activity_id,
          activity_sequence_id: completedActivitiesArrayDummy[0].activity_sequence_id,
        },
        {
          id: completedActivitiesArrayDummy[1].activity_id,
          activity_sequence_id: completedActivitiesArrayDummy[1].activity_sequence_id,
        },
        {
          id: completedActivitiesArrayDummy[2].activity_id,
          activity_sequence_id: completedActivitiesArrayDummy[2].activity_sequence_id,
        },
      ]);
      ActivityRepositoryMock.orm.find
        .mockResolvedValueOnce(ActivitiesArrayDummy.morning_activities)
        .mockResolvedValueOnce(ActivitiesArrayDummy.evening_activities);
      CompletedActivitySequenceServiceMock.getOrCreateCompletingSequenceLogForSyncing.mockResolvedValue({
        ...UncompletedSequenceLogDummy,
        activity_sequence_id: MorningActivitySequenceDummy.id,
      });
      CompletedActivityRepositoryMock.upsertActivity
        .mockResolvedValueOnce({ id: randomUUID() })
        .mockResolvedValueOnce({ id: randomUUID() })
        .mockResolvedValueOnce({ id: randomUUID() });
      CompletedActivityRepositoryMock.orm.find.mockResolvedValueOnce([]);

      await completedActivityService.completeMultipleActivities(
        [completedActivitiesArrayDummy[0], completedActivitiesArrayDummy[1], completedActivitiesArrayDummy[2]],
        {
          user_id: userDummy.id,
        },
      );

      expect(CompletedActivityRepositoryMock.upsertActivity).toBeCalledTimes(3);
    });
  });

  describe('groupActivitiesByDateAndSequence', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      jest.resetAllMocks();
    });

    it('Positive: should return array of objects with activities grouped by sequence and start date (input has 4 activities from 2 sequences on 3 different dates)', () => {
      const result = completedActivityService.groupActivitiesByDateAndSequence(completedActivitiesArrayDummy);

      expect(result).toStrictEqual(compledtedActivitiesSortedByDateAndIdDummy);
    });

    it('Positive: should return array of objects with activities grouped by sequence and start date (input has 2 activities from same sequence with different dates)', () => {
      const result = completedActivityService.groupActivitiesByDateAndSequence([
        completedActivitiesArrayDummy[2],
        completedActivitiesArrayDummy[3],
      ]);

      expect(result).toStrictEqual([
        {
          'aevf3dbf-c777-271e-912e-d7643d97a6ce': [
            {
              activity_id: '5c51f789-4563-4e74-a15d-9e17e3d15d06',
              device_id: DeviceDummy.id,
              activity_sequence_id: EveningActivitySequenceDummy.id,
              quantity_logged: 15,
              duration_logged: 120,
              start_time: new Date('2022-12-12T12:21:14.000Z'),
            },
          ],
        },
        {
          'aevf3dbf-c777-271e-912e-d7643d97a6ce': [
            {
              activity_id: '2c4af789-4563-4e74-a15d-9e17e3d15d06',
              device_id: DeviceDummy.id,
              activity_sequence_id: EveningActivitySequenceDummy.id,
              quantity_logged: 15,
              duration_logged: 120,
              start_time: new Date('2022-12-13T12:21:14+0000'),
            },
          ],
        },
      ]);
    });
  });

  describe('groupActivitiesBySequenceId', () => {
    it('Positive: should return object with arrays of activities grouped by their sequence ID', () => {
      const result = completedActivityService.groupActivitiesBySequenceId(completedActivitiesArrayDummy);

      expect(result).toStrictEqual(compledtedActivitiesSortedByIdDummy);
    });

    it('Positive: should return object with one key-value pair: the sequence id of the activity and an array containing the completed activity', () => {
      const result = completedActivityService.groupActivitiesBySequenceId([completedActivitiesArrayDummy[0]]);

      expect(result).toStrictEqual({
        'cfaf3dbf-b555-430e-810d-d7643d97c0f4': [
          {
            activity_id: '856eb9fb-8c12-418d-b12c-fec0f2dae49d',
            device_id: DeviceDummy.id,
            activity_sequence_id: MorningActivitySequenceDummy.id,
            quantity_logged: 15,
            duration_logged: 120,
            start_time: new Date('2022-12-10T12:21:14.000Z'),
          },
        ],
      });
    });
  });

  describe('getCompletedActivityNotes', () => {
    it("negative: if user tries to fetch notes for activity that doesn't belong to them exception should be thrown", async () => {
      const dummyFromDate = new Date('2022-12-10T12:21:14+0000');
      const dummyToDate = new Date('2022-12-15T12:21:14+0000');
      const fetchNotesParams = { activity_id: ActivityDummy.id, from_date: dummyFromDate, to_date: dummyToDate };
      CompletedActivityRepositoryMock.getNotes.mockResolvedValueOnce([]);
      ActivityRepositoryMock.orm.findOneBy.mockResolvedValueOnce({ ...ActivityDummy, user_id: randomUUID() });
      let exception: any;
      const errorMessage = `User with ID: ${userDummy.id} is not is not authorized to access activity with ID: ${ActivityDummy.id}`;

      try {
        await completedActivityService.getCompletedActivityNotes(userDummy.id, fetchNotesParams);
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeInstanceOf(UnauthorizedException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('positive: completed activity records retrieved from database should be formatted to include only completed activity id, activity name, date, and note for response', async () => {
      const fetchNotesParams = { activity_id: undefined, from_date: undefined, to_date: undefined };
      CompletedActivityRepositoryMock.getNotes.mockResolvedValueOnce(completedActivitiesWithNotesDummyArray);

      const response = await completedActivityService.getCompletedActivityNotes(userDummy.id, fetchNotesParams);

      expect(response).toStrictEqual([
        {
          completed_activity_id: completedActivitiesWithNotesDummyArray[0].id,
          date: completedActivitiesWithNotesDummyArray[0].start_time,
          activity_name: completedActivitiesWithNotesDummyArray[0].activity.activity_data.name,
          note: completedActivitiesWithNotesDummyArray[0].activity_note,
        },
        {
          completed_activity_id: completedActivitiesWithNotesDummyArray[1].id,
          date: completedActivitiesWithNotesDummyArray[1].start_time,
          activity_name: completedActivitiesWithNotesDummyArray[1].activity.activity_data.name,
          note: completedActivitiesWithNotesDummyArray[1].activity_note,
        },
      ]);
    });

    it('positive: notes should be queried from database with optional params passed into function', async () => {
      const dummyFromDate = new Date('2022-12-10T12:21:14+0000');
      const dummyToDate = new Date('2022-12-15T12:21:14+0000');
      const fetchNotesParams = {
        activity_id: ActivityDummy.id,
        from_date: dummyFromDate,
        to_date: dummyToDate,
        page_num: 1,
        per_page: 10,
      };
      CompletedActivityRepositoryMock.getNotes.mockResolvedValueOnce([]);
      ActivityRepositoryMock.orm.findOneBy.mockResolvedValueOnce(ActivityDummy);

      await completedActivityService.getCompletedActivityNotes(userDummy.id, fetchNotesParams);

      expect(CompletedActivityRepositoryMock.getNotes).toBeCalledWith(
        userDummy.id,
        ActivityDummy.id,
        dummyFromDate,
        dummyToDate,
        1,
        10,
      );
    });
  });

  describe('deleteCompletedActivityNotes', () => {
    it('negative: should throw unauthorized exception if user tries to delete note belonging to another user', async () => {
      const firstCompletedActivityId = completedActivitiesWithNotesDummyArray[0].id;
      const secondCompletedActivityId = completedActivitiesWithNotesDummyArray[1].id;
      CompletedActivityRepositoryMock.orm.findOneBy
        .mockResolvedValueOnce(completedActivitiesWithNotesDummyArray[0])
        .mockResolvedValueOnce(completedActivitiesWithNotesDummyArray[1]);
      let exception: any;
      const wrongUserId = randomUUID();
      const errorMessage = `User with ID: ${wrongUserId} is not authorized to delete note belonging to completed activity with ID: ${firstCompletedActivityId}`;

      try {
        await completedActivityService.deleteCompletedActivityNotes(wrongUserId, [
          firstCompletedActivityId,
          secondCompletedActivityId,
        ]);
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeInstanceOf(UnauthorizedException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('positive: should update completed activity records with activity_note field set to null for each ID passed to function in ID array', async () => {
      const firstCompletedActivityId = completedActivitiesWithNotesDummyArray[0].id;
      const secondCompletedActivityId = completedActivitiesWithNotesDummyArray[1].id;
      CompletedActivityRepositoryMock.orm.findOneBy
        .mockResolvedValueOnce(completedActivitiesWithNotesDummyArray[0])
        .mockResolvedValueOnce(completedActivitiesWithNotesDummyArray[1]);

      await completedActivityService.deleteCompletedActivityNotes(userDummy.id, [
        firstCompletedActivityId,
        secondCompletedActivityId,
      ]);

      expect(CompletedActivityRepositoryMock.orm.save).toBeCalledTimes(2);
      expect(CompletedActivityRepositoryMock.orm.save).toBeCalledWith({
        ...completedActivitiesWithNotesDummyArray[0],
        activity_note: null,
      });
      expect(CompletedActivityRepositoryMock.orm.save).toBeCalledWith({
        ...completedActivitiesWithNotesDummyArray[1],
        activity_note: null,
      });
    });
    it('negative: should throw not found exception if completed activity note is not found', async () => {
      const note_id = randomUUID();
      CompletedActivityRepositoryMock.orm.findOneBy.mockResolvedValue(null);
      let exception: any;
      const errorMessage = `Completed activity with ID: ${note_id} not found`;

      try {
        await completedActivityService.deleteCompletedActivityNotes(userDummy.id, [note_id]);
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });
  });

  describe('recalculateCurrentActivity', () => {
    it('positive: if user cut off time has been reached and current activity is standard priority, current activity should be updated to next high priority activity', async () => {
      // mock current time to be later than user cut off time
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2022-12-10T20:30:00.000Z'));
      const partialUserDummy = new User({
        id: randomUUID(),
        current_activity: eveningActivitiesDBResponseDummy[0],
        current_activity_sequence_id: EveningActivitySequenceDummy.id,
        current_activity_assigned_at: new Date('2022-12-10T20:30:00+0000'),
        current_completing_sequence_log_id: randomUUID(),
        timezone: 'UTC',
        startup_time: '05:00',
        shutdown_time: '18:00',
        cutoff_time_for_non_high_priority_activities: '20:00',
      });
      ActivitySequenceRepositoryMock.orm.findOne.mockResolvedValueOnce(EveningActivitySequenceDummy);
      CompletedActivityRepositoryMock.orm.find.mockResolvedValueOnce([]);
      const response = await completedActivityService.recalculateCurrentActivity(partialUserDummy);

      expect(response.activity).toBe(eveningActivitiesDBResponseDummy[1]);
    });

    it('positive: if user cut off time has not been reached yet, current activity should remain the same', async () => {
      // mock current time to be earlier than user cut off time
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2022-12-10T18:30:00.000Z'));
      const partialUserDummy = new User({
        id: randomUUID(),
        current_activity: eveningActivitiesDBResponseDummy[0],
        current_activity_sequence_id: EveningActivitySequenceDummy.id,
        current_activity_assigned_at: new Date('2022-12-10T18:30:00+0000'),
        current_completing_sequence_log_id: randomUUID(),
        timezone: 'UTC',
        startup_time: '05:00',
        shutdown_time: '18:00',
        cutoff_time_for_non_high_priority_activities: '20:00',
      });
      ActivitySequenceRepositoryMock.orm.findOne.mockResolvedValueOnce(EveningActivitySequenceDummy);
      CompletedActivityRepositoryMock.orm.find.mockResolvedValueOnce([]);

      const response = await completedActivityService.recalculateCurrentActivity(partialUserDummy);

      expect(response.activity).toBe(eveningActivitiesDBResponseDummy[0]);
    });

    it('positive: if user cut off time has been reached and current activity is high priority activity, current activity should not change', async () => {
      // mock current time to be later than user cut off time
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2022-12-10T20:30:00.000Z'));
      const partialUserDummy = new User({
        id: randomUUID(),
        current_activity: eveningActivitiesDBResponseDummy[1],
        current_activity_sequence_id: EveningActivitySequenceDummy.id,
        current_activity_assigned_at: new Date('2022-12-10T20:30:00+0000'),
        current_completing_sequence_log_id: randomUUID(),
        timezone: 'UTC',
        startup_time: '05:00',
        shutdown_time: '18:00',
        cutoff_time_for_non_high_priority_activities: '20:00',
      });
      ActivitySequenceRepositoryMock.orm.findOne.mockResolvedValueOnce(EveningActivitySequenceDummy);
      CompletedActivityRepositoryMock.orm.find.mockResolvedValueOnce([]);

      const response = await completedActivityService.recalculateCurrentActivity(partialUserDummy);

      expect(response.activity).toBe(eveningActivitiesDBResponseDummy[1]);
    });

    it("positive: if user cut off time has been reached but the user doesn't have any remaining high priority activities, current activity should be null and current sequence should be marked as completed", async () => {
      // mock current time to be later than user cut off time
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2022-12-10T20:30:00.000Z'));
      const partialUserDummy = new User({
        id: randomUUID(),
        current_activity: ActivitySequenceWithoutHighPriorityActivitiesDummy.activities[0],
        current_activity_sequence_id: ActivitySequenceWithoutHighPriorityActivitiesDummy.id,
        current_completing_sequence_log_id: randomUUID(),
        timezone: 'UTC',
        startup_time: '05:00',
        shutdown_time: '18:00',
        cutoff_time_for_non_high_priority_activities: '20:00',
      });
      ActivitySequenceRepositoryMock.orm.findOne.mockResolvedValueOnce(
        ActivitySequenceWithoutHighPriorityActivitiesDummy,
      );
      CompletedActivityRepositoryMock.orm.find.mockResolvedValueOnce([]);

      const response = await completedActivityService.recalculateCurrentActivity(partialUserDummy);

      expect(response.activity).toBe(null);
      expect(CompletedActivitySequenceServiceMock.completeActivitySequence).toBeCalledWith(
        partialUserDummy.current_completing_sequence_log_id,
        partialUserDummy.id,
      );
    });

    it("positive: if user current routine is evening routine, but it's time for morning routine, evening routine should be marked as completed and user current activity props should be cleared", async () => {
      // mock current time to be after user morning routine should start
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2022-12-10T05:30:00.000Z'));
      const partialUserDummy = new User({
        id: randomUUID(),
        current_activity: ActivityDummy,
        current_activity_sequence_id: ActivitySequenceDummy.id,
        current_activity_assigned_at: new Date('2022-12-09T20:00:00+0000'), // Evening routine started at 8 PM previous day
        current_completing_sequence_log_id: randomUUID(),
        current_sequence_started_at: new Date(),
        timezone: 'UTC',
        startup_time: '05:00',
        shutdown_time: '18:00',
        cutoff_time_for_non_high_priority_activities: '20:00',
      });
      ActivitySequenceRepositoryMock.orm.findOne.mockResolvedValueOnce({
        ...ActivitySequenceDummy,
        type: ActivityType.evening,
      });
      CompletedActivityRepositoryMock.orm.find.mockResolvedValueOnce([]);

      const response = await completedActivityService.recalculateCurrentActivity(partialUserDummy);

      expect(response.activity).toBe(null);
      expect(CompletedActivitySequenceServiceMock.completeActivitySequence).toBeCalledWith(
        partialUserDummy.current_completing_sequence_log_id,
        partialUserDummy.id,
      );
      expect(CompletedActivitySequenceServiceMock.nullifyUserCurrentActivityProps).toBeCalledWith(
        partialUserDummy.id,
        partialUserDummy.current_activity_sequence_id,
        partialUserDummy.current_sequence_started_at,
      );
    });

    it("positive: if user current routine is morning routine, but it's time for evening routine, morning routine should be marked as completed and user current activity props should be cleared", async () => {
      // mock current time to be after user evening routine should start
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2022-12-10T19:00:00.000Z'));
      const partialUserDummy = new User({
        id: randomUUID(),
        current_activity: ActivityDummy,
        current_activity_sequence_id: ActivitySequenceDummy.id,
        current_activity_assigned_at: new Date('2022-12-10T06:00:00+0000'), // Morning routine started at 6 AM
        current_completing_sequence_log_id: randomUUID(),
        current_sequence_started_at: new Date(),
        timezone: 'UTC',
        startup_time: '05:00',
        shutdown_time: '18:00',
        cutoff_time_for_non_high_priority_activities: '20:00',
      });
      ActivitySequenceRepositoryMock.orm.findOne.mockResolvedValueOnce({
        ...ActivitySequenceDummy,
        type: ActivityType.morning,
      });
      CompletedActivityRepositoryMock.orm.find.mockResolvedValueOnce([]);

      const response = await completedActivityService.recalculateCurrentActivity(partialUserDummy);

      expect(response.activity).toBe(null);
      expect(CompletedActivitySequenceServiceMock.completeActivitySequence).toBeCalledWith(
        partialUserDummy.current_completing_sequence_log_id,
        partialUserDummy.id,
      );
      expect(CompletedActivitySequenceServiceMock.nullifyUserCurrentActivityProps).toBeCalledWith(
        partialUserDummy.id,
        partialUserDummy.current_activity_sequence_id,
        partialUserDummy.current_sequence_started_at,
      );
    });

    it("positive: if user current routine is from previous day, but it's time for evening routine, current activity props should be cleared", async () => {
      // mock current time to be after user morning routine should start
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2022-12-10T05:30:00.000Z'));
      const partialUserDummy = new User({
        id: randomUUID(),
        current_activity: ActivityDummy,
        current_activity_sequence_id: ActivitySequenceDummy.activity_ids[0],
        // mock current activity start date to be from a previous day
        current_activity_assigned_at: new Date('2022-12-08T04:00:00+0000'),
        current_completing_sequence_log_id: randomUUID(),
        current_sequence_started_at: new Date(),
        timezone: 'UTC',
        startup_time: '05:00',
        shutdown_time: '18:00',
        cutoff_time_for_non_high_priority_activities: '20:00',
      });
      ActivitySequenceRepositoryMock.orm.findOne.mockResolvedValueOnce({
        ...ActivitySequenceDummy,
        type: ActivityType.morning,
      });

      const response = await completedActivityService.recalculateCurrentActivity(partialUserDummy);

      expect(response.activity).toBe(null);
      expect(CompletedActivitySequenceServiceMock.completeActivitySequence).toBeCalledWith(
        partialUserDummy.current_completing_sequence_log_id,
        partialUserDummy.id,
      );
      expect(CompletedActivitySequenceServiceMock.nullifyUserCurrentActivityProps).toBeCalledWith(
        partialUserDummy.id,
        partialUserDummy.current_activity_sequence_id,
        partialUserDummy.current_sequence_started_at,
      );
    });
  });

  it('guard: when routine should complete but no non-skipped logs exist, do not finalize; clear pointers only', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2022-12-10T05:30:00.000Z'));
    const partialUserDummy = new User({
      id: randomUUID(),
      current_activity: ActivityDummy,
      current_activity_sequence_id: ActivitySequenceDummy.id,
      current_activity_assigned_at: new Date('2022-12-09T20:00:00+0000'),
      current_completing_sequence_log_id: randomUUID(),
      current_sequence_started_at: new Date(),
      timezone: 'UTC',
      startup_time: '05:00',
      shutdown_time: '18:00',
      cutoff_time_for_non_high_priority_activities: '20:00',
    });
    ActivitySequenceRepositoryMock.orm.findOne.mockResolvedValueOnce({
      ...ActivitySequenceDummy,
      type: ActivityType.evening,
    });
    CompletedActivityRepositoryMock.orm.find.mockResolvedValueOnce([]);
    // No non-skipped logs in current sequence
    CompletedActivitySequenceServiceMock.getUncompletedSequenceLogWithActivities.mockResolvedValueOnce({
      completed_activity_logs: [{ metadata: { is_skipped: true } }, { metadata: { skipped_did_not_complete: true } }],
    });

    const response = await completedActivityService.recalculateCurrentActivity(partialUserDummy);

    expect(response.activity).toBe(null);
    expect(CompletedActivitySequenceServiceMock.completeActivitySequence).not.toBeCalled();
    expect(CompletedActivitySequenceServiceMock.clearUserCurrentActivityPropsWithoutCompletion).toBeCalledWith(
      partialUserDummy.id,
    );
    jest.useRealTimers();
  });

  it('positive: when at least one log has skipped_did_complete, finalize and clear pointers as completed', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-12-10T05:30:00.000Z'));
    const partialUserDummy = new User({
      id: randomUUID(),
      current_activity: ActivityDummy,
      current_activity_sequence_id: ActivitySequenceDummy.id,
      current_activity_assigned_at: new Date('2025-12-09T20:00:00+0000'),
      current_completing_sequence_log_id: randomUUID(),
      current_sequence_started_at: new Date(),
      timezone: 'UTC',
      startup_time: '05:00',
      shutdown_time: '18:00',
      cutoff_time_for_non_high_priority_activities: '20:00',
    });
    ActivitySequenceRepositoryMock.orm.findOne.mockResolvedValueOnce({
      ...ActivitySequenceDummy,
      type: ActivityType.evening,
    });
    CompletedActivityRepositoryMock.orm.find.mockResolvedValueOnce([]);
    CompletedActivitySequenceServiceMock.getUncompletedSequenceLogWithActivities.mockResolvedValueOnce({
      completed_activity_logs: [{ metadata: { is_skipped: true } }, { metadata: { skipped_did_complete: true } }],
    });

    const response = await completedActivityService.recalculateCurrentActivity(partialUserDummy);

    expect(response.activity).toBe(null);
    expect(CompletedActivitySequenceServiceMock.completeActivitySequence).toBeCalledWith(
      partialUserDummy.current_completing_sequence_log_id,
      partialUserDummy.id,
    );
    expect(CompletedActivitySequenceServiceMock.clearUserCurrentActivityPropsWithoutCompletion).not.toBeCalled();
    jest.useRealTimers();
  });

  describe('getLogQuantityAnswersByQuestionInTimeRange', () => {
    it('positive: should group log quantity answers by question ID', async () => {
      const questionOneId = randomUUID();
      const questionTwoId = randomUUID();
      LogQuantityAnswersRepositoryMock.getAnswersByQuestionIdsInTimeRange.mockResolvedValueOnce([
        new LogQuantityAnswer({
          id: randomUUID(),
          created_at: new Date().toDateString(),
          updated_at: new Date().toDateString(),
          user_id: userDummy.id,
          activity_id: 'a7e6f2e9-d783-4443-864e-22071b853700',
          question_id: questionTwoId,
          completed_activity_log_id: randomUUID(),
          logged_value: 4,
          date_logged: new Date(),
        }),
        new LogQuantityAnswer({
          id: randomUUID(),
          created_at: new Date().toDateString(),
          updated_at: new Date().toDateString(),
          user_id: userDummy.id,
          activity_id: 'a7e6f2e9-d783-4443-864e-22071b853700',
          question_id: questionOneId,
          completed_activity_log_id: randomUUID(),
          logged_value: 4,
          date_logged: new Date(),
        }),
      ]);

      const groupedLogQuantityAnswers = await completedActivityService.getLogQuantityAnswersByQuestionInTimeRange(
        {
          question_ids: [questionOneId, questionTwoId],
        },
        { from_time: new Date(), to_time: new Date() },
      );

      expect(groupedLogQuantityAnswers[questionOneId]).toBeArray();
      expect(groupedLogQuantityAnswers[questionOneId][0]).toBeInstanceOf(LogQuantityAnswer);
    });
  });

  describe('convertUtcToIana', () => {
    it('positive: should map +7 UTC timezone to Asia/Jakarta', () => {
      const timeZone = '+07:00';
      const res = completedActivityService.convertUtcToIana(timeZone);

      expect(res).toEqual(UTC_TO_IANA_MAP['+07:00']);
    });

    it('positive: should return original timezone if no match is found in map', () => {
      const timeZone = '-99:00';
      const iana = completedActivityService.convertUtcToIana(timeZone);

      expect(iana).toEqual(DEFAULT_IANA_TIMEZONE);
    });

    it('positive: should return original timezone if it is already in IANA format', () => {
      const timeZone = 'America/New_York';
      const res = completedActivityService.convertUtcToIana(timeZone);

      expect(res).toEqual(timeZone);
    });

    it('negative: should throw an error if timezone has invalid format', () => {
      const timeZone = 'invalid-timezone';
      let exception: any;

      try {
        completedActivityService.convertUtcToIana(timeZone);
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeInstanceOf(Error);
      expect(exception.message).toEqual('Invalid timezone format');
    });
  });

  describe('updateActivityPropsForOfflineSync', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      jest.resetAllMocks();
    });

    it("positive: if synced activity is morning activity from current day and it's currently time for user's morning routine, activity props should be updated", async () => {
      // mock current time to be after user morning routine should start
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2022-12-10T07:30:00+0000'));
      const completedActivityDummy = {
        ...completedActivitiesArrayDummy[0],
        start_time: new Date('2022-12-10T07:30:00+0000'),
      };
      ActivitySequenceRepositoryMock.orm.find.mockResolvedValueOnce([
        MorningActivitySequenceDummy,
        EveningActivitySequenceDummy,
        BreakActivitySequenceDummy,
      ]);
      CompletedActivitySequenceServiceMock.getOrCreateCompletingSequenceLogForSyncing.mockResolvedValueOnce({
        ...UncompletedSequenceLogDummy,
        activity_sequence_id: MorningActivitySequenceDummy.id,
      });
      CompletedActivityRepositoryMock.orm.find.mockResolvedValueOnce([]);

      await completedActivityService.updateActivityPropsForOfflineSync([completedActivityDummy], userDummy);

      expect(UserRepositoryMock.orm.update).toBeCalledWith(userDummy.id, {
        current_activity_id: MorningActivitySequenceDummy.activity_ids[1],
        current_activity_sequence_id: MorningActivitySequenceDummy.id,
        current_activity_assigned_at: new Date('2022-12-10T07:30:00.000Z'),
        current_sequence_started_at: new Date('2022-12-10T07:30:00.000Z'),
        current_completing_sequence_log_id: UncompletedSequenceLogDummy.id,
      });
    });

    it("positive: if synced activity is evening activity from current day and it's currently time for user's evening routine, activity props should be updated", async () => {
      // mock current time to be after user evening routine should start
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2022-12-10T21:30:00+0000'));
      const completedActivityDummy = {
        ...completedActivitiesArrayDummy[0],
        activity_sequence_id: EveningActivitySequenceDummy.id,
        activity_id: EveningActivitySequenceDummy.activity_ids[0],
        start_time: new Date('2022-12-10T21:30:00+0000'),
      };
      ActivitySequenceRepositoryMock.orm.find.mockResolvedValueOnce([
        MorningActivitySequenceDummy,
        EveningActivitySequenceDummy,
        BreakActivitySequenceDummy,
      ]);
      CompletedActivitySequenceServiceMock.getOrCreateCompletingSequenceLogForSyncing.mockResolvedValueOnce({
        ...UncompletedSequenceLogDummy,
        activity_sequence_id: EveningActivitySequenceDummy.id,
      });
      CompletedActivityRepositoryMock.orm.find.mockResolvedValueOnce([]);

      await completedActivityService.updateActivityPropsForOfflineSync([completedActivityDummy], userDummy);

      expect(UserRepositoryMock.orm.update).toBeCalledWith(userDummy.id, {
        current_activity_id: EveningActivitySequenceDummy.activity_ids[1],
        current_activity_sequence_id: EveningActivitySequenceDummy.id,
        current_activity_assigned_at: new Date('2022-12-10T21:30:00.000Z'),
        current_sequence_started_at: new Date('2022-12-10T21:30:00.000Z'),
        current_completing_sequence_log_id: UncompletedSequenceLogDummy.id,
      });
    });

    it("positive: if synced activity is morning activity from current day and it's currently time for user's evening routine, activity props should NOT be updated", async () => {
      // mock current time to be after user evening routine should start
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2022-12-10T21:30:00+0000'));
      const completedActivityDummy = {
        ...completedActivitiesArrayDummy[0],
        start_time: new Date('2022-12-10T07:30:00+0000'),
      };
      ActivitySequenceRepositoryMock.orm.find.mockResolvedValueOnce([
        MorningActivitySequenceDummy,
        EveningActivitySequenceDummy,
        BreakActivitySequenceDummy,
      ]);
      CompletedActivitySequenceServiceMock.getOrCreateCompletingSequenceLogForSyncing.mockResolvedValueOnce({
        ...UncompletedSequenceLogDummy,
        activity_sequence_id: MorningActivitySequenceDummy.id,
      });
      CompletedActivityRepositoryMock.orm.find.mockResolvedValueOnce([]);

      await completedActivityService.updateActivityPropsForOfflineSync([completedActivityDummy], userDummy);

      expect(UserRepositoryMock.orm.update).not.toBeCalled();
    });

    it('positive: if synced activity is break activity, activity props should NOT be updated', async () => {
      // mock current time to be between user morning and evening routine
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2022-12-10T13:30:00+0000'));
      const completedActivityDummy = {
        ...completedActivitiesArrayDummy[0],
        start_time: new Date('2022-12-10T13:30:00+0000'),
        activity_sequence_id: BreakActivitySequenceDummy.id,
      };
      ActivitySequenceRepositoryMock.orm.find.mockResolvedValueOnce([
        MorningActivitySequenceDummy,
        EveningActivitySequenceDummy,
        BreakActivitySequenceDummy,
      ]);
      CompletedActivitySequenceServiceMock.getOrCreateCompletingSequenceLogForSyncing.mockResolvedValueOnce({
        ...UncompletedSequenceLogDummy,
        activity_sequence_id: MorningActivitySequenceDummy.id,
      });
      CompletedActivityRepositoryMock.orm.find.mockResolvedValueOnce([]);

      await completedActivityService.updateActivityPropsForOfflineSync([completedActivityDummy], userDummy);

      expect(UserRepositoryMock.orm.update).not.toBeCalled();
    });

    it('positive: if synced activity is from a different day, activity props should NOT be updated', async () => {
      // mock current time to be after user evening routine should start
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2022-12-10T21:30:00+0000'));
      const completedActivityDummy = {
        ...completedActivitiesArrayDummy[0],
        start_time: new Date('2022-12-08T13:30:00+0000'),
        activity_sequence_id: BreakActivitySequenceDummy.id,
      };
      ActivitySequenceRepositoryMock.orm.find.mockResolvedValueOnce([
        MorningActivitySequenceDummy,
        EveningActivitySequenceDummy,
        BreakActivitySequenceDummy,
      ]);
      CompletedActivitySequenceServiceMock.getOrCreateCompletingSequenceLogForSyncing.mockResolvedValueOnce({
        ...UncompletedSequenceLogDummy,
        activity_sequence_id: MorningActivitySequenceDummy.id,
      });
      CompletedActivityRepositoryMock.orm.find.mockResolvedValueOnce([]);

      await completedActivityService.updateActivityPropsForOfflineSync([completedActivityDummy], userDummy);

      expect(UserRepositoryMock.orm.update).not.toBeCalled();
    });

    describe('hasCutoffTimeBeenReached (private method)', () => {
      const today = '2025-07-15';

      beforeEach(() => {
        jest.useFakeTimers();
      });

      afterEach(() => {
        jest.useRealTimers();
      });

      describe('Standard Day Schedule (7 AM - 11 PM)', () => {
        const startupTime = '07:00';
        const shutdownTime = '23:00';

        it('should handle cutoff at 2 PM correctly', () => {
          // Before cutoff
          jest.setSystemTime(new Date(`${today}T13:30:00.000Z`));
          expect(
            (completedActivityService as any).hasCutoffTimeBeenReached('14:00', 'UTC', startupTime, shutdownTime),
          ).toBe(false);

          // At cutoff
          jest.setSystemTime(new Date(`${today}T14:00:00.000Z`));
          expect(
            (completedActivityService as any).hasCutoffTimeBeenReached('14:00', 'UTC', startupTime, shutdownTime),
          ).toBe(true);

          // After cutoff
          jest.setSystemTime(new Date(`${today}T15:00:00.000Z`));
          expect(
            (completedActivityService as any).hasCutoffTimeBeenReached('14:00', 'UTC', startupTime, shutdownTime),
          ).toBe(true);
        });

        it('should handle early morning cutoff (5 AM) correctly', () => {
          // During active day (3 PM) - cutoff is tomorrow morning
          jest.setSystemTime(new Date(`${today}T15:00:00.000Z`));
          expect(
            (completedActivityService as any).hasCutoffTimeBeenReached('05:00', 'UTC', startupTime, shutdownTime),
          ).toBe(false);

          // Early morning before cutoff (4 AM)
          jest.setSystemTime(new Date(`${today}T04:00:00.000Z`));
          expect(
            (completedActivityService as any).hasCutoffTimeBeenReached('05:00', 'UTC', startupTime, shutdownTime),
          ).toBe(false);

          // Early morning after cutoff (5:30 AM)
          jest.setSystemTime(new Date(`${today}T05:30:00.000Z`));
          expect(
            (completedActivityService as any).hasCutoffTimeBeenReached('05:00', 'UTC', startupTime, shutdownTime),
          ).toBe(true);
        });

        it('should handle late night cutoff (1 AM) correctly', () => {
          // During active day (8 PM) - cutoff is tonight
          jest.setSystemTime(new Date(`${today}T20:00:00.000Z`));
          expect(
            (completedActivityService as any).hasCutoffTimeBeenReached('01:00', 'UTC', startupTime, shutdownTime),
          ).toBe(false);

          // After shutdown but before cutoff (midnight)
          const nextDay = '2025-07-16';
          jest.setSystemTime(new Date(`${nextDay}T00:00:00.000Z`));
          expect(
            (completedActivityService as any).hasCutoffTimeBeenReached('01:00', 'UTC', startupTime, shutdownTime),
          ).toBe(false);

          // After cutoff (2 AM)
          jest.setSystemTime(new Date(`${nextDay}T02:00:00.000Z`));
          expect(
            (completedActivityService as any).hasCutoffTimeBeenReached('01:00', 'UTC', startupTime, shutdownTime),
          ).toBe(true);
        });
      });

      describe('Night Shift Schedule (10 PM - 6 AM)', () => {
        const startupTime = '22:00';
        const shutdownTime = '06:00';

        it('should handle cutoff at 2 AM correctly', () => {
          // Before cutoff (11 PM)
          jest.setSystemTime(new Date(`${today}T23:00:00.000Z`));
          expect(
            (completedActivityService as any).hasCutoffTimeBeenReached('02:00', 'UTC', startupTime, shutdownTime),
          ).toBe(false);

          // At cutoff (2 AM)
          const nextDay = '2025-07-16';
          jest.setSystemTime(new Date(`${nextDay}T02:00:00.000Z`));
          expect(
            (completedActivityService as any).hasCutoffTimeBeenReached('02:00', 'UTC', startupTime, shutdownTime),
          ).toBe(true);

          // After cutoff (3 AM)
          jest.setSystemTime(new Date(`${nextDay}T03:00:00.000Z`));
          expect(
            (completedActivityService as any).hasCutoffTimeBeenReached('02:00', 'UTC', startupTime, shutdownTime),
          ).toBe(true);
        });

        it('should handle early evening cutoff (8 PM) correctly', () => {
          // During active hours (11 PM) - cutoff was earlier, already passed
          jest.setSystemTime(new Date(`${today}T23:00:00.000Z`));
          expect(
            (completedActivityService as any).hasCutoffTimeBeenReached('20:00', 'UTC', startupTime, shutdownTime),
          ).toBe(false);

          // Before startup (8 PM) - cutoff time
          jest.setSystemTime(new Date(`${today}T20:00:00.000Z`));
          expect(
            (completedActivityService as any).hasCutoffTimeBeenReached('20:00', 'UTC', startupTime, shutdownTime),
          ).toBe(true);
        });

        it('should handle morning cutoff (7 AM) correctly', () => {
          // During active hours (2 AM) - cutoff is later today
          const nextDay = '2025-07-16';
          jest.setSystemTime(new Date(`${nextDay}T02:00:00.000Z`));
          expect(
            (completedActivityService as any).hasCutoffTimeBeenReached('07:00', 'UTC', startupTime, shutdownTime),
          ).toBe(false);

          // After shutdown, after cutoff (8 AM)
          jest.setSystemTime(new Date(`${nextDay}T08:00:00.000Z`));
          expect(
            (completedActivityService as any).hasCutoffTimeBeenReached('07:00', 'UTC', startupTime, shutdownTime),
          ).toBe(true);
        });
      });

      describe('Edge Cases', () => {
        it('should return false when no cutoff time is set', () => {
          jest.setSystemTime(new Date(`${today}T14:00:00.000Z`));
          expect((completedActivityService as any).hasCutoffTimeBeenReached('', 'UTC', '07:00', '23:00')).toBe(false);
          expect((completedActivityService as any).hasCutoffTimeBeenReached(null, 'UTC', '07:00', '23:00')).toBe(false);
          expect((completedActivityService as any).hasCutoffTimeBeenReached(undefined, 'UTC', '07:00', '23:00')).toBe(
            false,
          );
        });

        it('should handle cutoff at midnight (00:00)', () => {
          const startupTime = '07:00';
          const shutdownTime = '23:00';

          // Before midnight (11:59 PM)
          jest.setSystemTime(new Date(`${today}T23:59:00.000Z`));
          expect(
            (completedActivityService as any).hasCutoffTimeBeenReached('00:00', 'UTC', startupTime, shutdownTime),
          ).toBe(false);

          // At midnight
          const nextDay = '2025-07-16';
          jest.setSystemTime(new Date(`${nextDay}T00:00:00.000Z`));
          expect(
            (completedActivityService as any).hasCutoffTimeBeenReached('00:00', 'UTC', startupTime, shutdownTime),
          ).toBe(true);
        });

        it('should handle cutoff exactly at startup time', () => {
          const startupTime = '07:00';
          const shutdownTime = '23:00';

          // During active day
          jest.setSystemTime(new Date(`${today}T15:00:00.000Z`));
          expect(
            (completedActivityService as any).hasCutoffTimeBeenReached('07:00', 'UTC', startupTime, shutdownTime),
          ).toBe(true);
        });

        it('should handle cutoff exactly at shutdown time', () => {
          const startupTime = '07:00';
          const shutdownTime = '23:00';

          // At shutdown time
          jest.setSystemTime(new Date(`${today}T23:00:00.000Z`));
          expect(
            (completedActivityService as any).hasCutoffTimeBeenReached('23:00', 'UTC', startupTime, shutdownTime),
          ).toBe(true);
        });
      });

      describe('Different Timezones', () => {
        it('should work correctly with America/New_York timezone', () => {
          const startupTime = '07:00';
          const shutdownTime = '23:00';

          // Set time to 3 PM EDT (which is 7 PM UTC)
          jest.setSystemTime(new Date(`${today}T19:00:00.000Z`));

          // At 3 PM in New York, a 2 PM cutoff should have been reached
          expect(
            (completedActivityService as any).hasCutoffTimeBeenReached(
              '14:00',
              'America/New_York',
              startupTime,
              shutdownTime,
            ),
          ).toBe(true);

          // Before 2 PM in New York (1 PM EDT = 5 PM UTC)
          jest.setSystemTime(new Date(`${today}T17:00:00.000Z`));
          expect(
            (completedActivityService as any).hasCutoffTimeBeenReached(
              '14:00',
              'America/New_York',
              startupTime,
              shutdownTime,
            ),
          ).toBe(false);
        });
      });
    });

    describe('completeActivity - Integration with midnight cutoff', () => {
      const today = '2025-07-15';
      const createUserWithMidnightCutoff = (cutoffTime: string) => ({
        ...userDummy,
        cutoff_time_for_non_high_priority_activities: cutoffTime,
        timezone: 'UTC',
        startup_time: '07:00',
        shutdown_time: '23:00',
      });

      beforeEach(() => {
        jest.useFakeTimers();

        // Set up mock for isVerboseLoggingAllowed
        UserServiceMock.isVerboseLoggingAllowed.mockResolvedValue({
          isVerboseLoggingAllowed: false,
          user: null,
        });

        // Set up queue mock
        CompletedActivityQueueMock.add.mockResolvedValue({ id: 'test-job-id' });
      });

      afterEach(() => {
        jest.useRealTimers();
      });

      it('should NOT complete routine when completing a standard habit and midnight cutoff has not been reached', async () => {
        // Set current time to 01:00 AM, cutoff at 02:00 AM (not reached)
        jest.setSystemTime(new Date(`${today}T01:00:00.000Z`));

        const userWithMidnightCutoff = createUserWithMidnightCutoff('02:00');
        const activityPayload: CreateCompletedActivityDto = {
          activity_id: ActivitySequenceWithHighPriorityActivitiesDummy.activities[0].id,
          quantity_logged: 10,
          duration_logged: 600,
          note_logged: 'test note',
          device_id: DeviceDummy.id,
          activity_sequence_id: ActivitySequenceWithHighPriorityActivitiesDummy.id,
          start_time: new Date(`${today}T01:00:00.000Z`),
          finish_time: new Date(`${today}T01:10:00.000Z`),
          metadata: { is_skipped: false },
        };

        ActivitySequenceRepositoryMock.orm.findOne.mockResolvedValueOnce(
          ActivitySequenceWithHighPriorityActivitiesDummy,
        );
        ActivityRepositoryMock.orm.findOneBy.mockResolvedValueOnce({
          ...ActivitySequenceWithHighPriorityActivitiesDummy.activities[0],
          activity_data: { name: 'Standard Priority Activity', priority: ActivityPriority.STANDARD },
        });
        UserRepositoryMock.orm.findOne.mockResolvedValue(userWithMidnightCutoff);
        CompletedActivityRepositoryMock.upsertActivity.mockResolvedValueOnce({ id: randomUUID() });
        CompletedActivityRepositoryMock.orm.find.mockResolvedValueOnce([]);
        CompletedActivitySequenceServiceMock.getOrCreateCompletingSequenceLog.mockResolvedValueOnce(
          UncompletedSequenceLogDummy,
        );

        await completedActivityService.completeActivity(activityPayload, fastifyRequestDummy.headers, {
          user_id: userDummy.id,
        });

        // It should proceed to the next activity in the sequence because cutoff time has not been reached
        expect(UserRepositoryMock.orm.update).toHaveBeenCalledWith(
          userDummy.id,
          expect.objectContaining({
            current_activity_id: ActivitySequenceWithHighPriorityActivitiesDummy.activities[1].id,
          }),
        );
        expect(CompletedActivitySequenceServiceMock.completeActivitySequence).not.toHaveBeenCalled();
      });

      it('should complete routine when completing a standard habit, cutoff is reached, and no HIGH priority activities remain', async () => {
        // Set current time to 03:00 AM, cutoff at 02:00 AM (reached)
        jest.setSystemTime(new Date(`${today}T03:00:00.000Z`));

        const userWithMidnightCutoff = {
          ...createUserWithMidnightCutoff('02:00'),
          current_sequence_started_at: new Date(`${today}T01:00:00.000Z`),
        };
        const activityPayload: CreateCompletedActivityDto = {
          activity_id: ActivitySequenceWithoutHighPriorityActivitiesDummy.activities[0].id,
          quantity_logged: 10,
          duration_logged: 600,
          note_logged: 'test note',
          device_id: DeviceDummy.id,
          activity_sequence_id: ActivitySequenceWithoutHighPriorityActivitiesDummy.id,
          start_time: new Date(`${today}T03:00:00.000Z`),
          finish_time: new Date(`${today}T03:10:00.000Z`),
          metadata: { is_skipped: false },
        };

        ActivitySequenceRepositoryMock.orm.findOne.mockResolvedValueOnce(
          ActivitySequenceWithoutHighPriorityActivitiesDummy,
        );
        ActivityRepositoryMock.orm.findOneBy.mockResolvedValueOnce({
          ...ActivitySequenceWithoutHighPriorityActivitiesDummy.activities[0],
          activity_data: { name: 'Standard Priority Activity', priority: ActivityPriority.STANDARD },
        });
        UserRepositoryMock.orm.findOne.mockResolvedValue(userWithMidnightCutoff);
        CompletedActivityRepositoryMock.upsertActivity.mockResolvedValueOnce({ id: randomUUID() });
        CompletedActivityRepositoryMock.orm.find.mockResolvedValueOnce([]);
        CompletedActivitySequenceServiceMock.getOrCreateCompletingSequenceLog.mockResolvedValueOnce(
          UncompletedSequenceLogDummy,
        );

        await completedActivityService.completeActivity(activityPayload, fastifyRequestDummy.headers, {
          user_id: userDummy.id,
        });

        // Should complete the routine (next activity is null) because cutoff time is reached and no high priority habits are left
        expect(UserRepositoryMock.orm.update).toHaveBeenCalledWith(
          userDummy.id,
          expect.objectContaining({
            current_activity_id: null,
            last_completed_sequence_id: ActivitySequenceWithoutHighPriorityActivitiesDummy.id,
          }),
        );
        expect(CompletedActivitySequenceServiceMock.completeActivitySequence).toHaveBeenCalledWith(
          UncompletedSequenceLogDummy.id,
          userDummy.id,
        );
      });
    });
  });
  describe('Integration with Activity Completion', () => {
    const createUserWithMidnightCutoff = (cutoffTime: string) => ({
      ...userDummy,
      cutoff_time_for_non_high_priority_activities: cutoffTime,
      timezone: 'UTC',
    });

    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should NOT complete routine when completing habit with midnight cutoff not reached', async () => {
      // Set current time to 01:00 AM, cutoff at 02:00 AM (not reached)
      jest.setSystemTime(new Date('2025-07-14T01:00:00.000Z'));

      const userWithMidnightCutoff = createUserWithMidnightCutoff('02:00');
      const activity: CreateCompletedActivityDto = {
        activity_id: ActivitySequenceWithHighPriorityActivitiesDummy.activities[0].id,
        quantity_logged: 10,
        duration_logged: 600,
        note_logged: 'test note',
        device_id: DeviceDummy.id,
        activity_sequence_id: ActivitySequenceWithHighPriorityActivitiesDummy.id,
        start_time: new Date('2025-07-14T01:00:00.000Z'),
        finish_time: new Date('2025-07-14T01:10:00.000Z'),
        metadata: { is_skipped: false },
      };

      ActivitySequenceRepositoryMock.orm.findOne.mockResolvedValueOnce(ActivitySequenceWithHighPriorityActivitiesDummy);
      ActivityRepositoryMock.orm.findOneBy.mockResolvedValueOnce({
        ...ActivitySequenceWithHighPriorityActivitiesDummy.activities[0],
        activity_data: { name: 'Standard Priority Activity', priority: ActivityPriority.STANDARD },
      });
      UserRepositoryMock.orm.findOne.mockResolvedValue(userWithMidnightCutoff);
      CompletedActivityRepositoryMock.upsertActivity.mockResolvedValueOnce({ id: randomUUID() });
      CompletedActivityRepositoryMock.orm.find.mockResolvedValueOnce([]);
      CompletedActivitySequenceServiceMock.getOrCreateCompletingSequenceLog.mockResolvedValueOnce(
        UncompletedSequenceLogDummy,
      );

      await completedActivityService.completeActivity(activity, fastifyRequestDummy.headers, {
        user_id: userDummy.id,
      });

      // Should set next activity in sequence (not complete routine)
      expect(UserRepositoryMock.orm.update).toBeCalledWith(userDummy.id, {
        current_activity_id: ActivitySequenceWithHighPriorityActivitiesDummy.activities[1].id,
        current_activity_sequence_id: ActivitySequenceWithHighPriorityActivitiesDummy.id,
        current_activity_assigned_at: expect.toBeDateString(),
        current_sequence_started_at: expect.toBeDateString(),
        current_completing_sequence_log_id: UncompletedSequenceLogDummy.id,
        current_sequence_skipped_activities: null,
        has_received_inactivity_warning: false,
        updated_at: expect.toBeDateString(),
      });
    });

    it('should complete routine when completing habit with midnight cutoff reached and no HIGH priority activities remain', async () => {
      // Set current time to 03:00 AM, cutoff at 02:00 AM (reached)
      jest.setSystemTime(new Date('2025-07-14T03:00:00.000Z'));

      const userWithMidnightCutoff = createUserWithMidnightCutoff('02:00');
      const activity: CreateCompletedActivityDto = {
        activity_id: ActivitySequenceWithoutHighPriorityActivitiesDummy.activities[0].id,
        quantity_logged: 10,
        duration_logged: 600,
        note_logged: 'test note',
        device_id: DeviceDummy.id,
        activity_sequence_id: ActivitySequenceWithoutHighPriorityActivitiesDummy.id,
        start_time: new Date('2025-07-14T03:00:00.000Z'),
        finish_time: new Date('2025-07-14T03:10:00.000Z'),
        metadata: { is_skipped: false },
      };

      ActivitySequenceRepositoryMock.orm.findOne.mockResolvedValueOnce(
        ActivitySequenceWithoutHighPriorityActivitiesDummy,
      );
      ActivityRepositoryMock.orm.findOneBy.mockResolvedValueOnce({
        ...ActivitySequenceWithoutHighPriorityActivitiesDummy.activities[0],
        activity_data: { name: 'Standard Priority Activity', priority: ActivityPriority.STANDARD },
      });
      // The user object needs to have `current_sequence_started_at` to correctly calculate the `last_completed_sequence_started_at`
      UserRepositoryMock.orm.findOne.mockResolvedValue({
        ...userWithMidnightCutoff,
        current_sequence_started_at: new Date('2025-07-14T01:00:00.000Z'),
      });
      CompletedActivityRepositoryMock.upsertActivity.mockResolvedValueOnce({ id: randomUUID() });
      CompletedActivityRepositoryMock.orm.find.mockResolvedValueOnce([]);
      CompletedActivitySequenceServiceMock.getOrCreateCompletingSequenceLog.mockResolvedValueOnce(
        UncompletedSequenceLogDummy,
      );

      await completedActivityService.completeActivity(activity, fastifyRequestDummy.headers, {
        user_id: userDummy.id,
      });

      // Should complete routine (set current activity to null)
      expect(UserRepositoryMock.orm.update).toBeCalledWith(
        userDummy.id,
        expect.objectContaining({
          current_activity_id: null,
          current_activity_sequence_id: null,
          last_completed_sequence_id: ActivitySequenceWithoutHighPriorityActivitiesDummy.id,
          last_completed_sequence_at: new Date('2025-07-14T03:00:00.000Z'),
          current_sequence_started_at: null,
          last_completed_sequence_started_at: new Date('2025-07-14T01:00:00.000Z'),
        }),
      );
    });
  });
});
