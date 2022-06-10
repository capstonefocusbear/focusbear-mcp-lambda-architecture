import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomInt, randomUUID } from 'crypto';
import {
  ActivityRepositoryMock,
  ActivitySequenceRepositoryMock,
  CompletedActivityRepositoryMock,
  DeviceServiceMock,
  UserRepositoryMock,
} from '../../../../../test/mocks';
import { ActivitySequenceDummy, LeaderDeviceDummy } from '../../../../../test/dummies ';
import { DeviceService } from '../../../device/services/device/device.service';
import { CreateCompletedActivityDto } from '../../dto/create-completed-activity.dto';
import { ActivitySequenceRepository } from '../../repositories/activity-sequence.repository';
import { CompletedActivityRepository } from '../../repositories/completed-activity.repository';
import { CompletedActivityService } from './completed-activity.service';
import { UserRepository } from '../../../user/repositories/user.repository';
import { ActivitySequence } from '../../entities/activity-sequence.entity';
import { CompletedActivity } from '../../entities/completed-activity.entity';
import { ActivityRepository } from '../../repositories/activity.repository';

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
      .compile();

    completedactivityService = moduleRef.get<CompletedActivityService>(CompletedActivityService);
  });

  it('should be defined', () => {
    expect(completedactivityService).toBeDefined();
  });

  describe('compliteActivity', () => {
    const completedActivity: CreateCompletedActivityDto = {
      activity_id: randomUUID(),
      quantity_logged: randomInt(20),
      note_logged: 'some text',
      device_id: randomUUID(),
      activity_sequence_id: ActivitySequenceDummy.id,
      timestamp: new Date(Date.now()),
    };

    const user_id = randomUUID();

    const sequenceWhenThereIsNextActivity: ActivitySequence = {
      ...ActivitySequenceDummy,
      activity_ids: [completedActivity.activity_id, ...ActivitySequenceDummy.activity_ids],
    };

    const sequenceWhenThereIsNoNextActivity: ActivitySequence = {
      ...ActivitySequenceDummy,
      activity_ids: [...ActivitySequenceDummy.activity_ids, completedActivity.activity_id],
    };

    it('negative: should throw NotFoundException if activity sequence does not exist', async () => {
      ActivitySequenceRepositoryMock.orm.findOne.mockResolvedValueOnce(null);
      const errorMessage = `Activity Sequence with id: ${completedActivity.activity_sequence_id} does not exist!`;
      let exception: any;

      try {
        await completedactivityService.compliteActivity(completedActivity, { user_id });
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('negative: should throw ConflictException if activity aequence does not containe comoplited activity id', async () => {
      ActivitySequenceRepositoryMock.orm.findOne.mockResolvedValueOnce(ActivitySequenceDummy);
      const errorMessage = `Activity with id: ${completedActivity.activity_id} does not exist in the Secuense with id: ${completedActivity.activity_sequence_id}!`;
      let exception: any;

      try {
        await completedactivityService.compliteActivity(completedActivity, { user_id });
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(ConflictException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('positive: the target device should be marked as leader', async () => {
      ActivitySequenceRepositoryMock.orm.findOne.mockResolvedValueOnce(sequenceWhenThereIsNextActivity);

      await completedactivityService.compliteActivity(completedActivity, { user_id });

      expect(DeviceServiceMock.markAsLeader).toBeCalledWith(completedActivity.device_id, user_id);
    });

    it('positive: if there is the next activity in the sequence, its id should be set as current_activity_id for the given User', async () => {
      ActivitySequenceRepositoryMock.orm.findOne.mockResolvedValueOnce(sequenceWhenThereIsNextActivity);

      await completedactivityService.compliteActivity(completedActivity, { user_id });

      expect(UserRepositoryMock.orm.update).toBeCalledWith(user_id, {
        current_activity_id: sequenceWhenThereIsNextActivity.activity_ids[1],
        current_activity_sequence_id: sequenceWhenThereIsNextActivity.id,
      });
    });

    it('positive: if there is no next activity in the sequence, current_activity_id should be set NULL for the given User', async () => {
      ActivitySequenceRepositoryMock.orm.findOne.mockResolvedValueOnce(sequenceWhenThereIsNoNextActivity);

      await completedactivityService.compliteActivity(completedActivity, { user_id });

      expect(UserRepositoryMock.orm.update).toBeCalledWith(user_id, {
        current_activity_id: null,
        current_activity_sequence_id: null,
      });
    });

    it('positive: completed activity record should be created', async () => {
      ActivitySequenceRepositoryMock.orm.findOne.mockResolvedValueOnce(sequenceWhenThereIsNextActivity);
      DeviceServiceMock.markAsLeader.mockResolvedValue(LeaderDeviceDummy);

      await completedactivityService.compliteActivity(completedActivity, { user_id });

      expect(CompletedActivityRepositoryMock.create).toBeCalledWith(
        new CompletedActivity({ ...completedActivity, user_id }),
      );
    });
  });
});
