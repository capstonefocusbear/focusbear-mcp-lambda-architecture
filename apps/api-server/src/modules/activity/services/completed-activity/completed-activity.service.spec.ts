import { BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomInt, randomUUID } from 'crypto';
import { SENTRY_TOKEN } from '@ntegral/nestjs-sentry';
import { Settings } from 'luxon';
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
} from '../../../../../test/mocks';
import {
  ActivitiesArrayDummy,
  ActivityDummy,
  ActivitySequenceDummy,
  ActivitySequenceWithHighPriorityActivitiesDummy,
  ActivitySequenceWithoutHighPriorityActivitiesDummy,
  compledtedActivitiesSortedByDateAndIdDummy,
  compledtedActivitiesSortedByIdDummy,
  completedActivitiesArrayDummy,
  completedActivitiesWithNotesDummyArray,
  CompletedActivityDummy,
  CompletedFocusBlockDummy,
  DeviceDummy,
  EveningActivitySequenceDummy,
  LeaderDeviceDummy,
  MorningActivitySequenceDummy,
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
import { PusherService } from '../../../../../../../libs/pusher/src';
import { ActivityCompletedPush } from '../../domain/activity-completed-push.model';
import { CompletedFocusBlockRepository } from '../../../focus-mode/repositories/completed-focus-block.repository';
import { ActivityType } from '../../domain/activity-type.enum';
import { DaySummary } from '../../domain/day-summary.mode';
import { UserSettingsService } from '../../../user/services/user-settings/user-settings.service';
import { CompletedActivityResponse } from '../../domain/completed-activity-response.model';
import { UserDailyStatsService } from '../../../user/services/user-daily-stats/user-daily-stats.service';

describe('CompletedActivityService', () => {
  let completedActivityService: CompletedActivityService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
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
      .compile();

    completedActivityService = moduleRef.get<CompletedActivityService>(CompletedActivityService);

    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(completedActivityService).toBeDefined();
  });

  describe('completeActivity', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      jest.resetAllMocks();
    });

    const randomQuantity = randomInt(20);
    const completedActivity: CreateCompletedActivityDto = {
      activity_id: ActivityDummy.id,
      quantity_logged: randomQuantity,
      duration_logged: 600,
      note_logged: 'some text',
      device_id: DeviceDummy.id,
      activity_sequence_id: ActivityDummy.activity_sequence_id,
      start_time: new Date(Date.now() - 60),
      finish_time: new Date(Date.now() - 1),
      metadata: { is_skipped: false },
    };

    const completedActivityUpsertFormat = {
      activity_id: ActivityDummy.id,
      quantity_logged: randomQuantity,
      duration_logged: 600,
      activity_note: 'some text',
      activity_sequence_id: ActivityDummy.activity_sequence_id,
      start_time: new Date(Date.now() - 60),
      finish_time: new Date(Date.now() - 1),
      metadata: { is_skipped: false },
    };

    const user_id = userDummy.id;

    const sequenceWhenThereIsNextActivity = new ActivitySequence({
      ...ActivitySequenceDummy,
      activity_ids: [completedActivity.activity_id, ...ActivitySequenceDummy.activity_ids],
    });

    const sequenceWhenThereIsNoNextActivity = new ActivitySequence({
      ...ActivitySequenceDummy,
      activity_ids: [...ActivitySequenceDummy.activity_ids, completedActivity.activity_id],
    });

    it('negative: should throw NotFoundException if activity sequence does not exist', async () => {
      ActivitySequenceRepositoryMock.orm.findOne.mockResolvedValueOnce(null);
      const errorMessage = `Activity Sequence with id: ${completedActivity.activity_sequence_id} does not exist!`;
      let exception: any;

      try {
        await completedActivityService.completeActivity(completedActivity, { user_id });
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
        await completedActivityService.completeActivity(completedActivity, { user_id });
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
        await completedActivityService.completeActivity(completedActivity, { user_id });
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
        await completedActivityService.completeActivity(completedActivity, { user_id });
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
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(userDummy);
      CompletedActivityRepositoryMock.upsert.mockResolvedValueOnce({ id: randomUUID() });
      CompletedActivitySequenceServiceMock.getOrCreateCompletingSequenceLog.mockResolvedValueOnce(
        UncompletedSequenceLogDummy,
      );

      await completedActivityService.completeActivity(completedActivity, { user_id });

      expect(DeviceServiceMock.markAsLeader).toBeCalledWith(completedActivity.device_id, user_id);
    });

    it('positive: if there is the next activity in the sequence, its id should be set as current_activity_id for the given User', async () => {
      ActivitySequenceRepositoryMock.orm.findOne.mockResolvedValueOnce(sequenceWhenThereIsNextActivity);
      ActivityRepositoryMock.orm.findOneBy.mockResolvedValueOnce(ActivityDummy);
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(userDummy);
      CompletedActivityRepositoryMock.upsert.mockResolvedValueOnce({ id: randomUUID() });
      CompletedActivitySequenceServiceMock.getOrCreateCompletingSequenceLog.mockResolvedValueOnce(
        UncompletedSequenceLogDummy,
      );

      await completedActivityService.completeActivity(completedActivity, { user_id });

      expect(UserRepositoryMock.orm.update).toBeCalledWith(user_id, {
        current_activity_id: sequenceWhenThereIsNextActivity.activity_ids[1],
        current_activity_sequence_id: sequenceWhenThereIsNextActivity.id,
        current_activity_assigned_at: expect.toBeDateString(),
        current_sequence_started_at: expect.toBeDateString(),
        current_completing_sequence_log_id: UncompletedSequenceLogDummy.id,
        current_sequence_skipped_activities: null,
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
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(userWithCurrentActivity);
      CompletedActivitySequenceServiceMock.completeActivitySequence.mockResolvedValueOnce(null);
      CompletedActivityRepositoryMock.upsert.mockResolvedValueOnce({ id: randomUUID() });
      CompletedActivitySequenceServiceMock.getOrCreateCompletingSequenceLog.mockResolvedValueOnce(
        UncompletedSequenceLogDummy,
      );

      await completedActivityService.completeActivity(completedActivity, { user_id });

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
      });
    });

    it('positive: completed activity record should be created', async () => {
      ActivitySequenceRepositoryMock.orm.findOne.mockResolvedValueOnce(sequenceWhenThereIsNextActivity);
      ActivityRepositoryMock.orm.findOneBy.mockResolvedValueOnce(ActivityDummy);
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(userDummy);
      DeviceServiceMock.markAsLeader.mockResolvedValue(LeaderDeviceDummy);
      CompletedActivitySequenceServiceMock.completeActivitySequence.mockResolvedValueOnce(null);
      CompletedActivityRepositoryMock.upsert.mockResolvedValueOnce({ id: randomUUID() });
      CompletedActivitySequenceServiceMock.getOrCreateCompletingSequenceLog.mockResolvedValueOnce(
        UncompletedSequenceLogDummy,
      );

      await completedActivityService.completeActivity(completedActivity, { user_id });
      expect(CompletedActivityRepositoryMock.upsert).toBeCalledWith(
        new CompletedActivity(
          { ...completedActivityUpsertFormat, user_id, completed_sequence_id: undefined },
          { generateId: false, log_quantity: ActivityDummy.log_quantity },
        ),
        ['activity_id', 'completed_sequence_id'],
      );
    });

    it('positive: push notification should be sent via pusher', async () => {
      ActivitySequenceRepositoryMock.orm.findOne.mockResolvedValueOnce(sequenceWhenThereIsNextActivity);
      ActivityRepositoryMock.orm.findOneBy.mockResolvedValueOnce(ActivityDummy);
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(userDummy);
      DeviceServiceMock.markAsLeader.mockResolvedValue(LeaderDeviceDummy);
      CompletedActivitySequenceServiceMock.completeActivitySequence.mockResolvedValueOnce(null);
      const completedActivityId = randomUUID();
      CompletedActivityRepositoryMock.upsert.mockResolvedValueOnce({ id: completedActivityId });
      CompletedActivitySequenceServiceMock.getOrCreateCompletingSequenceLog.mockResolvedValueOnce(
        UncompletedSequenceLogDummy,
      );

      await completedActivityService.completeActivity(completedActivity, { user_id });

      expect(PusherServiceMock.trigger).toBeCalledWith(
        `private-${user_id}`,
        'activity-completed',
        new ActivityCompletedPush(completedActivityId, { ...completedActivity }),
      );
    });

    it('positive: if there is no next activity in the sequence, this sequence should be completed', async () => {
      const userWithCurrentActivity: User = {
        ...userDummy,
        current_activity_id: completedActivity.activity_id,
        current_activity_sequence_id: completedActivity.activity_sequence_id,
      };
      ActivitySequenceRepositoryMock.orm.findOne.mockResolvedValueOnce(sequenceWhenThereIsNoNextActivity);
      ActivityRepositoryMock.orm.findOneBy.mockResolvedValueOnce(ActivityDummy);
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(userWithCurrentActivity);
      DeviceServiceMock.markAsLeader.mockResolvedValue(LeaderDeviceDummy);
      CompletedActivityRepositoryMock.upsert.mockResolvedValueOnce({ id: randomUUID() });
      CompletedActivitySequenceServiceMock.getOrCreateCompletingSequenceLog.mockResolvedValueOnce(
        UncompletedSequenceLogDummy,
      );

      await completedActivityService.completeActivity(completedActivity, { user_id });

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
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(userDummy);
      ActivityRepositoryMock.orm.findOneBy.mockResolvedValueOnce(activityWithChoices.choices[0]);
      DeviceServiceMock.markAsLeader.mockResolvedValue(LeaderDeviceDummy);
      CompletedActivitySequenceServiceMock.completeActivitySequence.mockResolvedValueOnce(null);
      CompletedActivityRepositoryMock.upsert.mockResolvedValueOnce({ id: randomUUID() });
      CompletedActivitySequenceServiceMock.getOrCreateCompletingSequenceLog.mockResolvedValueOnce(
        UncompletedSequenceLogDummy,
      );

      await completedActivityService.completeActivity(dtoWithChoice, { user_id });

      expect(CompletedActivityRepositoryMock.upsert).toBeCalledWith(
        new CompletedActivity(
          { ...completedActivityUpsertFormat, quantity_logged: null, user_id, completed_sequence_id: undefined },
          { generateId: false, log_quantity: false },
        ),
        ['activity_id', 'completed_sequence_id'],
      );
      expect(CompletedActivityRepositoryMock.upsert).toBeCalledWith(
        new CompletedActivity(
          {
            ...completedActivityUpsertFormat,
            activity_id: dtoWithChoice.choice_id,
            activity_sequence_id: null,
            user_id,
          },
          { generateId: false, log_quantity: activityWithChoices.choices[0].log_quantity },
        ),
        ['activity_id', 'completed_sequence_id'],
      );
    });

    it('positive: if target activity is break type the sequence check should be skipped', async () => {
      ActivityDummy.type = ActivityType.break;
      ActivitySequenceRepositoryMock.orm.findOne.mockResolvedValueOnce(sequenceWhenThereIsNextActivity);
      ActivityRepositoryMock.orm.findOneBy.mockResolvedValueOnce(ActivityDummy);
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(userDummy);
      DeviceServiceMock.markAsLeader.mockResolvedValue(LeaderDeviceDummy);
      CompletedActivitySequenceServiceMock.completeActivitySequence.mockResolvedValueOnce(null);
      CompletedActivityRepositoryMock.upsert.mockResolvedValueOnce({ id: randomUUID() });

      await completedActivityService.completeActivity(completedActivity, { user_id });

      expect(CompletedActivityRepositoryMock.upsert).toBeCalledWith(
        new CompletedActivity(
          { ...completedActivityUpsertFormat, user_id, completed_sequence_id: undefined },
          { generateId: false, log_quantity: ActivityDummy.log_quantity },
        ),
        ['activity_id', 'completed_sequence_id'],
      );
    });

    it('positive: if user cutofff time has been reached, set the next activity to be the next high priority activity in sequence when marking activity as completed', async () => {
      Settings.now = () => 1665081000000;
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
      ActivitySequenceRepositoryMock.orm.findOne.mockResolvedValueOnce(ActivitySequenceWithHighPriorityActivitiesDummy);
      ActivityRepositoryMock.orm.findOneBy.mockResolvedValueOnce(activity);
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce({
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
      CompletedActivityRepositoryMock.upsert.mockResolvedValueOnce({ id: randomUUID() });

      await completedActivityService.completeActivity(activity, { user_id });

      expect(UserRepositoryMock.orm.update).toBeCalledWith(user_id, {
        current_activity_id: ActivitySequenceWithHighPriorityActivitiesDummy.activities[2].id,
        current_activity_sequence_id: ActivitySequenceWithHighPriorityActivitiesDummy.id,
        current_activity_assigned_at: expect.toBeDateString(),
        current_sequence_started_at: expect.toBeDateString(),
        current_completing_sequence_log_id: completingSequenceLogId,
        current_sequence_skipped_activities: null,
      });
      Settings.now = () => new Date().valueOf();
    });

    it('positive: if user cutoff time has been reached and no high priorities remain, sequence should be completed', async () => {
      Settings.now = () => 1665081000000;
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
      ActivitySequenceRepositoryMock.orm.findOne.mockResolvedValueOnce(
        ActivitySequenceWithoutHighPriorityActivitiesDummy,
      );
      ActivityRepositoryMock.orm.findOneBy.mockResolvedValueOnce(activity);
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce({
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
      CompletedActivityRepositoryMock.upsert.mockResolvedValueOnce({ id: randomUUID() });

      await completedActivityService.completeActivity(activity, { user_id });

      expect(UserRepositoryMock.orm.update).toBeCalledWith(user_id, {
        current_activity_id: null,
        current_activity_sequence_id: null,
        current_activity_assigned_at: null,
        last_completed_sequence_id: ActivitySequenceWithoutHighPriorityActivitiesDummy.id,
        last_completed_sequence_at: expect.toBeValidDate(),
        last_completed_sequence_started_at: '2023-02-07T05:42:39.221Z',
        current_sequence_started_at: expect.toBeValidDate(),
        current_completing_sequence_log_id: null,
        current_sequence_skipped_activities: null,
      });
      Settings.now = () => new Date().valueOf();
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
    });

    const sequenceWhenThereIsNoNextActivity = new ActivitySequence({
      ...ActivitySequenceDummy,
      activity_ids: [...ActivitySequenceDummy.activity_ids, completedActivity.activity_id],
    });

    it('positive: the target device should be marked as leader', async () => {
      ActivitySequenceRepositoryMock.orm.findOne.mockResolvedValueOnce(sequenceWhenThereIsNextActivity);
      ActivityRepositoryMock.orm.findOneBy.mockResolvedValueOnce(ActivityDummy);
      const user = { ...userDummy, current_sequence_skipped_activities: [randomUUID()] };
      UserRepositoryMock.orm.findOne.mockResolvedValue(user);
      CompletedActivityRepositoryMock.create.mockResolvedValueOnce({ id: randomUUID() });
      CompletedActivitySequenceServiceMock.getOrCreateCompletingSequenceLog.mockResolvedValueOnce(
        UncompletedSequenceLogDummy,
      );

      await completedActivityService.skipActivity(completedActivity, { user_id });

      expect(DeviceServiceMock.markAsLeader).toBeCalledWith(completedActivity.device_id, user_id);
    });

    it('positive: if there is the next activity in the sequence, its id should be set as current_activity_id for the given User', async () => {
      const previousSkippedId = randomUUID();
      ActivitySequenceRepositoryMock.orm.findOne.mockResolvedValueOnce(sequenceWhenThereIsNextActivity);
      ActivityRepositoryMock.orm.findOneBy.mockResolvedValueOnce(ActivityDummy);
      const user = { ...userDummy, current_sequence_skipped_activities: [previousSkippedId] };
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(user);
      CompletedActivityRepositoryMock.create.mockResolvedValueOnce({ id: randomUUID() });
      CompletedActivitySequenceServiceMock.getOrCreateCompletingSequenceLog.mockResolvedValueOnce(
        UncompletedSequenceLogDummy,
      );

      await completedActivityService.skipActivity(completedActivity, { user_id });

      expect(UserRepositoryMock.orm.update).toBeCalledWith(user_id, {
        current_activity_id: sequenceWhenThereIsNextActivity.activity_ids[1],
        current_activity_sequence_id: sequenceWhenThereIsNextActivity.id,
        current_activity_assigned_at: expect.toBeDateString(),
        current_sequence_started_at: expect.toBeDateString(),
        current_completing_sequence_log_id: UncompletedSequenceLogDummy.id,
        current_sequence_skipped_activities: [previousSkippedId, completedActivity.activity_id],
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
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(userWithCurrentActivity);
      CompletedActivitySequenceServiceMock.completeActivitySequence.mockResolvedValueOnce(null);
      CompletedActivityRepositoryMock.create.mockResolvedValueOnce({ id: randomUUID() });
      CompletedActivitySequenceServiceMock.getOrCreateCompletingSequenceLog.mockResolvedValueOnce(
        UncompletedSequenceLogDummy,
      );

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
      });
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
      const activityWithFalsyQuantityLogs: Activity = { ...ActivityDummy, log_quantity: false };
      ActivityRepositoryMock.orm.findOneBy.mockResolvedValueOnce(activityWithFalsyQuantityLogs);

      await completedActivityService.getStatsByActivityPerDay(params, query);

      expect(CompletedActivityRepositoryMock.getAggregatedQuantityLogsPerDay).toBeCalledWith(params.activity_id, {
        ...query,
        log_summary_type: activityWithFalsyQuantityLogs.log_summary_type,
        stat_type: ActivityStatType.duration,
      });
    });

    it('positive: if log_quantity set to true, stat_type value should be "quantity"', async () => {
      const activityWithTruthyQuantityLogs: Activity = { ...ActivityDummy, log_quantity: true };
      ActivityRepositoryMock.orm.findOneBy.mockResolvedValueOnce(activityWithTruthyQuantityLogs);

      await completedActivityService.getStatsByActivityPerDay(params, query);

      expect(CompletedActivityRepositoryMock.getAggregatedQuantityLogsPerDay).toBeCalledWith(params.activity_id, {
        ...query,
        log_summary_type: activityWithTruthyQuantityLogs.log_summary_type,
        stat_type: ActivityStatType.quantity,
      });
    });

    it('positive: should return instance of CompletedActivityStats', async () => {
      ActivityRepositoryMock.orm.findOneBy.mockResolvedValueOnce(ActivityDummy);
      const statItemsDummy = [{ date: new Date(Date.now()), summary: '30' }];
      CompletedActivityRepositoryMock.getAggregatedQuantityLogsPerDay.mockResolvedValueOnce(statItemsDummy);

      const result = await completedActivityService.getStatsByActivityPerDay(params, query);

      expect(result).toBeDefined();
      expect(result).toBeInstanceOf(CompletedActivityStats);
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

    it('positive: guantity_logged value should be reassigned and the updated item saved', async () => {
      CompletedActivityRepositoryMock.orm.findOneBy.mockResolvedValue(CompletedActivityDummy);

      await completedActivityService.reviseCompletedLog(CompletedActivityDummy.id, { quantity_logged });

      const updatedItem = { ...CompletedActivityDummy, quantity_logged };
      expect(CompletedActivityRepositoryMock.orm.save).toBeCalledWith(updatedItem);
    });
  });

  describe('getDaySummary', () => {
    it('negative: should throw NotFoundException if user does not exist', async () => {
      const user_id = randomUUID();
      UserRepositoryMock.orm.findOneBy.mockResolvedValue(null);
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

      const result = await completedActivityService.getDaySummary(userDummy.id, 'UTC');

      expect(result).toBeInstanceOf(DaySummary);
    });

    it('positive: should return DaySummary with current time between 24:00 and 01:00 (test previous error)', async () => {
      Settings.now = () => 1665448200000;
      const timerange = { from_time: '2022-10-11T06:15:00.000Z', to_time: '2022-10-11T00:30:00.000Z' };

      UserRepositoryMock.orm.findOneBy.mockResolvedValue(userDummy);
      CompletedFocusBlockRepositoryMock.getLogsByUserInTimeRange.mockResolvedValue([CompletedFocusBlockDummy]);
      CompletedActivityRepositoryMock.getDaySummaryAVG.mockResolvedValue([CompletedActivityDummy]);
      CompletedActivityRepositoryMock.getDaySummarySUM.mockResolvedValue([CompletedActivityDummy]);
      CompletedActivityRepositoryMock.getDaySummaryDuration.mockResolvedValue([CompletedActivityDummy]);
      const result = await completedActivityService.getDaySummary(userDummy.id, 'UTC');

      expect(result).toBeInstanceOf(DaySummary);
      expect(CompletedFocusBlockRepositoryMock.getLogsByUserInTimeRange).toBeCalledWith(userDummy.id, timerange);
      Settings.now = () => new Date().valueOf();
    });

    it('positive: should return DaySummary with timezone unsupported by .toISOString (test previous error)', async () => {
      Settings.now = () => 1667248935000;
      const timerange = { from_time: '2022-10-31T09:15:00.000Z', to_time: '2022-10-31T20:42:15.000Z' };
      UserRepositoryMock.orm.findOneBy.mockResolvedValue(userDummy);
      CompletedFocusBlockRepositoryMock.getLogsByUserInTimeRange.mockResolvedValue([CompletedFocusBlockDummy]);
      CompletedActivityRepositoryMock.getDaySummaryAVG.mockResolvedValue([CompletedActivityDummy]);
      CompletedActivityRepositoryMock.getDaySummarySUM.mockResolvedValue([CompletedActivityDummy]);
      CompletedActivityRepositoryMock.getDaySummaryDuration.mockResolvedValue([CompletedActivityDummy]);
      const result = await completedActivityService.getDaySummary(userDummy.id, 'America/Moncton');

      expect(result).toBeInstanceOf(DaySummary);
      expect(CompletedFocusBlockRepositoryMock.getLogsByUserInTimeRange).toBeCalledWith(userDummy.id, timerange);
      Settings.now = () => new Date().valueOf();
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

    it('Positive: should return an array of completed activities', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      ActivitySequenceRepositoryMock.orm.findOneBy.mockResolvedValueOnce(MorningActivitySequenceDummy);
      ActivityRepositoryMock.orm.find.mockResolvedValue(ActivitiesArrayDummy.morning_activities);
      CompletedActivitySequenceServiceMock.getOrCreateCompletingSequenceLogForSyncing.mockResolvedValue({
        ...UncompletedSequenceLogDummy,
        activity_sequence_id: MorningActivitySequenceDummy.id,
      });
      CompletedActivityRepositoryMock.upsert
        .mockResolvedValueOnce({ id: '1b9fa7be-0cef-4554-bac3-1190705ea08b' })
        .mockResolvedValueOnce({ id: '1d39fa59-3ca2-4252-ab9a-affa41634634' });

      const result = await completedActivityService.completeMultipleActivities(
        [completedActivitiesArrayDummy[0], completedActivitiesArrayDummy[1]],
        {
          user_id: userDummy.id,
        },
      );

      expect(result[0]).toBeInstanceOf(CompletedActivityResponse);
      expect(result).toMatchSnapshot();
    });

    it('Positive: should fetch sequence for each sequence activities are from (case with activities from 2 different sequences)', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      ActivitySequenceRepositoryMock.orm.findOneBy
        .mockResolvedValueOnce(MorningActivitySequenceDummy)
        .mockResolvedValueOnce(EveningActivitySequenceDummy);
      ActivityRepositoryMock.orm.find
        .mockResolvedValueOnce(ActivitiesArrayDummy.morning_activities)
        .mockResolvedValueOnce(ActivitiesArrayDummy.evening_activities);
      CompletedActivitySequenceServiceMock.getOrCreateCompletingSequenceLogForSyncing.mockResolvedValue({
        ...UncompletedSequenceLogDummy,
        activity_sequence_id: MorningActivitySequenceDummy.id,
      });
      CompletedActivityRepositoryMock.upsert
        .mockResolvedValueOnce({ id: randomUUID() })
        .mockResolvedValueOnce({ id: randomUUID() });

      await completedActivityService.completeMultipleActivities(
        [completedActivitiesArrayDummy[0], completedActivitiesArrayDummy[1], completedActivitiesArrayDummy[2]],
        {
          user_id: userDummy.id,
        },
      );

      expect(ActivitySequenceRepositoryMock.orm.findOneBy).toBeCalledWith({ id: MorningActivitySequenceDummy.id });
      expect(ActivitySequenceRepositoryMock.orm.findOneBy).toBeCalledWith({ id: EveningActivitySequenceDummy.id });
    });

    it('Positive: should fetch activities for each sequence activities belong to', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      ActivitySequenceRepositoryMock.orm.findOneBy
        .mockResolvedValueOnce(MorningActivitySequenceDummy)
        .mockResolvedValueOnce(EveningActivitySequenceDummy);
      ActivityRepositoryMock.orm.find
        .mockResolvedValueOnce(ActivitiesArrayDummy.morning_activities)
        .mockResolvedValueOnce(ActivitiesArrayDummy.evening_activities);
      CompletedActivitySequenceServiceMock.getOrCreateCompletingSequenceLogForSyncing.mockResolvedValue({
        ...UncompletedSequenceLogDummy,
        activity_sequence_id: MorningActivitySequenceDummy.id,
      });
      CompletedActivityRepositoryMock.upsert
        .mockResolvedValueOnce({ id: randomUUID() })
        .mockResolvedValueOnce({ id: randomUUID() });

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
      ActivitySequenceRepositoryMock.orm.findOneBy
        .mockResolvedValueOnce(MorningActivitySequenceDummy)
        .mockResolvedValueOnce(EveningActivitySequenceDummy);
      ActivityRepositoryMock.orm.find
        .mockResolvedValueOnce(ActivitiesArrayDummy.morning_activities)
        .mockResolvedValueOnce(ActivitiesArrayDummy.evening_activities);
      CompletedActivitySequenceServiceMock.getOrCreateCompletingSequenceLogForSyncing.mockResolvedValue({
        ...UncompletedSequenceLogDummy,
        activity_sequence_id: MorningActivitySequenceDummy.id,
      });
      CompletedActivityRepositoryMock.upsert
        .mockResolvedValueOnce({ id: randomUUID() })
        .mockResolvedValueOnce({ id: randomUUID() })
        .mockResolvedValueOnce({ id: randomUUID() });

      await completedActivityService.completeMultipleActivities(
        [completedActivitiesArrayDummy[0], completedActivitiesArrayDummy[1], completedActivitiesArrayDummy[2]],
        {
          user_id: userDummy.id,
        },
      );

      expect(CompletedActivityRepositoryMock.upsert).toBeCalledTimes(3);
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
  });
});
