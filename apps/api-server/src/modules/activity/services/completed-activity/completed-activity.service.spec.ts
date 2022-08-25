import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomInt, randomUUID } from 'crypto';
import {
  ActivityRepositoryMock,
  ActivitySequenceRepositoryMock,
  CompletedActivityRepositoryMock,
  CompletedActivitySequenceServiceMock,
  DeviceServiceMock,
  PusherServiceMock,
  UserRepositoryMock,
} from '../../../../../test/mocks';
import {
  ActivityDummy,
  ActivitySequenceDummy,
  DeviceDummy,
  LeaderDeviceDummy,
  userDummy,
} from '../../../../../test/dummies ';
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

describe('CompletedActivityService', () => {
  let completedactivityService: CompletedActivityService;

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
      .compile();

    completedactivityService = moduleRef.get<CompletedActivityService>(CompletedActivityService);
  });

  it('should be defined', () => {
    expect(completedactivityService).toBeDefined();
  });

  describe('completeActivity', () => {
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

    it('negative: should throw NotFoundException if activity sequence does not exist', async () => {
      ActivitySequenceRepositoryMock.orm.findOne.mockResolvedValueOnce(null);
      const errorMessage = `Activity Sequence with id: ${completedActivity.activity_sequence_id} does not exist!`;
      let exception: any;

      try {
        await completedactivityService.completeActivity(completedActivity, { user_id });
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('negative: should throw NotFoundException if activity does not exist', async () => {
      ActivitySequenceRepositoryMock.orm.findOne.mockResolvedValueOnce(ActivitySequenceDummy);
      ActivityRepositoryMock.orm.findOne.mockResolvedValueOnce(null);
      const errorMessage = `Activity with id: ${completedActivity.activity_id} does not exist!`;
      let exception: any;

      try {
        await completedactivityService.completeActivity(completedActivity, { user_id });
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('negative: should throw NotFoundException if user does not exist', async () => {
      ActivitySequenceRepositoryMock.orm.findOne.mockResolvedValueOnce(ActivitySequenceDummy);
      ActivityRepositoryMock.orm.findOne.mockResolvedValueOnce(ActivityDummy);
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(null);
      const errorMessage = `User with id: ${user_id} does not exist!`;
      let exception: any;

      try {
        await completedactivityService.completeActivity(completedActivity, { user_id });
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
      ActivityRepositoryMock.orm.findOne.mockResolvedValueOnce(activityWithChoices);
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(userDummy);

      const errorMsg = `Activity with id: ${activityWithChoices.id} cannot be completed without choice_id provided`;
      let exception: any;

      try {
        await completedactivityService.completeActivity(completedActivity, { user_id });
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(BadRequestException);
      expect(exception.message).toEqual(errorMsg);
    });

    it('negative: should throw BadRequestException if there is no current sequence and given activity is not first in the sequence', async () => {
      ActivitySequenceRepositoryMock.orm.findOne.mockResolvedValueOnce(sequenceWhenThereIsNoNextActivity);
      ActivityRepositoryMock.orm.findOne.mockResolvedValueOnce(ActivityDummy);
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(userDummy);
      const errorMsg = `Unable to set new current sequence: ${sequenceWhenThereIsNoNextActivity.id}, given activity: ${completedActivity.activity_id} is not first!`;
      let exception: any;

      try {
        await completedactivityService.completeActivity(completedActivity, { user_id });
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(BadRequestException);
      expect(exception.message).toEqual(errorMsg);
    });

    it('negative: should throw BadRequestException if the completing activity_sequence is not a current one for a given user', async () => {
      const userWithWrongSequence: User = { ...userDummy, current_activity_sequence_id: randomUUID() };
      ActivitySequenceRepositoryMock.orm.findOne.mockResolvedValueOnce(ActivitySequenceDummy);
      ActivityRepositoryMock.orm.findOne.mockResolvedValueOnce(ActivityDummy);
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(userWithWrongSequence);
      const errorMsg = `activity_sequence_id: ${completedActivity.activity_sequence_id} is not a current sequence: ${userWithWrongSequence.current_activity_sequence_id}`;
      let exception: any;

      try {
        await completedactivityService.completeActivity(completedActivity, { user_id });
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(BadRequestException);
      expect(exception.message).toEqual(errorMsg);
    });

    it('negative: should throw BadRequestException if the completing activity is not a current one for a given user', async () => {
      const userWithWrongActivity: User = {
        ...userDummy,
        current_activity_id: randomUUID(),
        current_activity_sequence_id: completedActivity.activity_sequence_id,
      };
      ActivitySequenceRepositoryMock.orm.findOne.mockResolvedValueOnce(ActivitySequenceDummy);
      ActivityRepositoryMock.orm.findOne.mockResolvedValueOnce(ActivityDummy);
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(userWithWrongActivity);
      const errorMsg = `activity_id: ${completedActivity.activity_id} is not a current activity: ${userWithWrongActivity.current_activity_id}`;
      let exception: any;

      try {
        await completedactivityService.completeActivity(completedActivity, { user_id });
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(BadRequestException);
      expect(exception.message).toEqual(errorMsg);
    });

    it('positive: the target device should be marked as leader', async () => {
      ActivitySequenceRepositoryMock.orm.findOne.mockResolvedValueOnce(sequenceWhenThereIsNextActivity);
      ActivityRepositoryMock.orm.findOne.mockResolvedValueOnce(ActivityDummy);
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(userDummy);
      CompletedActivityRepositoryMock.create.mockResolvedValueOnce({ id: randomUUID() });

      await completedactivityService.completeActivity(completedActivity, { user_id });

      expect(DeviceServiceMock.markAsLeader).toBeCalledWith(completedActivity.device_id, user_id);
    });

    it('positive: if there is the next activity in the sequence, its id should be set as current_activity_id for the given User', async () => {
      ActivitySequenceRepositoryMock.orm.findOne.mockResolvedValueOnce(sequenceWhenThereIsNextActivity);
      ActivityRepositoryMock.orm.findOne.mockResolvedValueOnce(ActivityDummy);
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(userDummy);
      CompletedActivityRepositoryMock.create.mockResolvedValueOnce({ id: randomUUID() });

      await completedactivityService.completeActivity(completedActivity, { user_id });

      expect(UserRepositoryMock.orm.update).toBeCalledWith(user_id, {
        current_activity_id: sequenceWhenThereIsNextActivity.activity_ids[1],
        current_activity_sequence_id: sequenceWhenThereIsNextActivity.id,
        current_activity_assigned_at: expect.toBeDate(),
      });
    });

    it('positive: if there is no next activity in the sequence, current_activity_id should be set NULL for the given User', async () => {
      const userWithCurrentActivity: User = {
        ...userDummy,
        current_activity_id: completedActivity.activity_id,
        current_activity_sequence_id: completedActivity.activity_sequence_id,
      };
      ActivitySequenceRepositoryMock.orm.findOne.mockResolvedValueOnce(sequenceWhenThereIsNoNextActivity);
      ActivityRepositoryMock.orm.findOne.mockResolvedValueOnce(ActivityDummy);
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(userWithCurrentActivity);
      CompletedActivitySequenceServiceMock.completeActivitySequence.mockResolvedValueOnce(null);
      CompletedActivityRepositoryMock.create.mockResolvedValueOnce({ id: randomUUID() });

      await completedactivityService.completeActivity(completedActivity, { user_id });

      expect(UserRepositoryMock.orm.update).toBeCalledWith(user_id, {
        current_activity_id: null,
        current_activity_sequence_id: null,
        current_activity_assigned_at: null,
        last_completed_sequence_id: userWithCurrentActivity.current_activity_sequence_id,
        last_completed_sequence_at: expect.toBeDate(),
      });
    });

    it('positive: completed activity record should be created', async () => {
      ActivitySequenceRepositoryMock.orm.findOne.mockResolvedValueOnce(sequenceWhenThereIsNextActivity);
      ActivityRepositoryMock.orm.findOne.mockResolvedValueOnce(ActivityDummy);
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(userDummy);
      DeviceServiceMock.markAsLeader.mockResolvedValue(LeaderDeviceDummy);
      CompletedActivitySequenceServiceMock.completeActivitySequence.mockResolvedValueOnce(null);
      CompletedActivityRepositoryMock.create.mockResolvedValueOnce({ id: randomUUID() });

      await completedactivityService.completeActivity(completedActivity, { user_id });

      expect(CompletedActivityRepositoryMock.create).toBeCalledWith(
        new CompletedActivity(
          { ...completedActivity, user_id },
          { generateId: false, log_quantity: ActivityDummy.log_quantity },
        ),
      );
    });
    it('positive: push notification should be sent via pusher', async () => {
      ActivitySequenceRepositoryMock.orm.findOne.mockResolvedValueOnce(sequenceWhenThereIsNextActivity);
      ActivityRepositoryMock.orm.findOne.mockResolvedValueOnce(ActivityDummy);
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(userDummy);
      DeviceServiceMock.markAsLeader.mockResolvedValue(LeaderDeviceDummy);
      CompletedActivitySequenceServiceMock.completeActivitySequence.mockResolvedValueOnce(null);
      const completedActivityId = randomUUID();
      CompletedActivityRepositoryMock.create.mockResolvedValueOnce({ id: completedActivityId });

      await completedactivityService.completeActivity(completedActivity, { user_id });

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
      ActivityRepositoryMock.orm.findOne.mockResolvedValueOnce(ActivityDummy);
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(userWithCurrentActivity);
      DeviceServiceMock.markAsLeader.mockResolvedValue(LeaderDeviceDummy);
      CompletedActivityRepositoryMock.create.mockResolvedValueOnce({ id: randomUUID() });

      await completedactivityService.completeActivity(completedActivity, { user_id });

      const { activity_sequence_id } = completedActivity;
      expect(CompletedActivitySequenceServiceMock.completeActivitySequence).toBeCalledWith(
        activity_sequence_id,
        user_id,
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
      ActivityRepositoryMock.orm.findOne.mockResolvedValueOnce(activityWithChoices);
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(userDummy);
      ActivityRepositoryMock.orm.findOne.mockResolvedValueOnce(activityWithChoices.choices[0]);
      DeviceServiceMock.markAsLeader.mockResolvedValue(LeaderDeviceDummy);
      CompletedActivitySequenceServiceMock.completeActivitySequence.mockResolvedValueOnce(null);
      CompletedActivityRepositoryMock.create.mockResolvedValueOnce({ id: randomUUID() });

      await completedactivityService.completeActivity(dtoWithChoice, { user_id });

      expect(CompletedActivityRepositoryMock.create).toBeCalledWith(
        new CompletedActivity(
          { ...completedActivity, quantity_logged: null, user_id },
          { generateId: false, log_quantity: false },
        ),
      );
      expect(CompletedActivityRepositoryMock.create).toBeCalledWith(
        new CompletedActivity(
          { ...completedActivity, activity_id: dtoWithChoice.choice_id, activity_sequence_id: null, user_id },
          { generateId: false, log_quantity: activityWithChoices.choices[0].log_quantity },
        ),
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
      ActivityRepositoryMock.orm.findOne.mockResolvedValueOnce(null);
      const errorMessage = `Activity with id: ${params.activity_id} does not exist!`;
      let exception: any;

      try {
        await completedactivityService.getStatsByActivityPerDay(params, query);
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('positive: if log_quantity set to false, stat_type value should be "duration"', async () => {
      const activityWithFalsyQuantityLogs: Activity = { ...ActivityDummy, log_quantity: false };
      ActivityRepositoryMock.orm.findOne.mockResolvedValueOnce(activityWithFalsyQuantityLogs);

      await completedactivityService.getStatsByActivityPerDay(params, query);

      expect(CompletedActivityRepositoryMock.getAggregatedQuantityLogsPerDay).toBeCalledWith(params.activity_id, {
        ...query,
        log_summary_type: activityWithFalsyQuantityLogs.log_summary_type,
        stat_type: ActivityStatType.duration,
      });
    });

    it('positive: if log_quantity set to true, stat_type value should be "quantity"', async () => {
      const activityWithTruthyQuantityLogs: Activity = { ...ActivityDummy, log_quantity: true };
      ActivityRepositoryMock.orm.findOne.mockResolvedValueOnce(activityWithTruthyQuantityLogs);

      await completedactivityService.getStatsByActivityPerDay(params, query);

      expect(CompletedActivityRepositoryMock.getAggregatedQuantityLogsPerDay).toBeCalledWith(params.activity_id, {
        ...query,
        log_summary_type: activityWithTruthyQuantityLogs.log_summary_type,
        stat_type: ActivityStatType.quantity,
      });
    });

    it('positive: should return instance of CompletedActivityStats', async () => {
      ActivityRepositoryMock.orm.findOne.mockResolvedValueOnce(ActivityDummy);
      const statItemsDummy = [{ date: new Date(Date.now()), summary: '30' }];
      CompletedActivityRepositoryMock.getAggregatedQuantityLogsPerDay.mockResolvedValueOnce(statItemsDummy);

      const result = await completedactivityService.getStatsByActivityPerDay(params, query);

      expect(result).toBeDefined();
      expect(result).toBeInstanceOf(CompletedActivityStats);
    });
  });
});
