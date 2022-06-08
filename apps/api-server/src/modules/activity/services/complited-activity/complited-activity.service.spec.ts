import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomInt, randomUUID } from 'crypto';
import {
  ActivitySequenceRepositoryMock,
  ComplitedActivityRepositoryMock,
  DeviceServiceMock,
  UserRepositoryMock,
} from '../../../../../test/mocks';
import { ActivitySequenceDummy, LeaderDeviceDummy } from '../../../../../test/dummies ';
import { DeviceService } from '../../../device/services/device/device.service';
import { CreateComplitedActivityDto } from '../../dto/create-complited-activity.dto';
import { ActivitySequenceRepository } from '../../repositories/activity-sequence.repository';
import { ComplitedActivityRepository } from '../../repositories/complited-activity.repository';
import { ComplitedActivityService } from './complited-activity.service';
import { UserRepository } from '../../../user/repositories/user.repository';
import { ActivitySequence } from '../../entities/activity-sequence.entity';
import { ComplitedActivity } from '../../entities/complited-activity.entity';

describe('ComplitedActivityService', () => {
  let complitedactivityService: ComplitedActivityService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        ComplitedActivityService,
        ComplitedActivityRepository,
        DeviceService,
        ActivitySequenceRepository,
        UserRepository,
      ],
    })
      .overrideProvider(ComplitedActivityRepository)
      .useValue(ComplitedActivityRepositoryMock)
      .overrideProvider(ActivitySequenceRepository)
      .useValue(ActivitySequenceRepositoryMock)
      .overrideProvider(DeviceService)
      .useValue(DeviceServiceMock)
      .overrideProvider(UserRepository)
      .useValue(UserRepositoryMock)
      .compile();

    complitedactivityService = moduleRef.get<ComplitedActivityService>(ComplitedActivityService);
  });

  it('should be defined', () => {
    expect(complitedactivityService).toBeDefined();
  });

  describe('compliteActivity', () => {
    const complitedActivity: CreateComplitedActivityDto = {
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
      activity_ids: [complitedActivity.activity_id, ...ActivitySequenceDummy.activity_ids],
    };

    const sequenceWhenThereIsNoNextActivity: ActivitySequence = {
      ...ActivitySequenceDummy,
      activity_ids: [...ActivitySequenceDummy.activity_ids, complitedActivity.activity_id],
    };

    it('negative: should throw NotFoundException if activity sequence does not exist', async () => {
      ActivitySequenceRepositoryMock.orm.findOne.mockResolvedValueOnce(null);
      const errorMessage = `Activity Sequence with id: ${complitedActivity.activity_sequence_id} does not exist!`;
      let exception: any;

      try {
        await complitedactivityService.compliteActivity(complitedActivity, { user_id });
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('negative: should throw ConflictException if activity aequence does not containe comoplited activity id', async () => {
      ActivitySequenceRepositoryMock.orm.findOne.mockResolvedValueOnce(ActivitySequenceDummy);
      const errorMessage = `Activity with id: ${complitedActivity.activity_id} does not exist in the Secuense with id: ${complitedActivity.activity_sequence_id}!`;
      let exception: any;

      try {
        await complitedactivityService.compliteActivity(complitedActivity, { user_id });
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(ConflictException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('positive: the target device should be marked as leader', async () => {
      ActivitySequenceRepositoryMock.orm.findOne.mockResolvedValueOnce(sequenceWhenThereIsNextActivity);

      await complitedactivityService.compliteActivity(complitedActivity, { user_id });

      expect(DeviceServiceMock.markAsLeader).toBeCalledWith(complitedActivity.device_id, user_id);
    });

    it('positive: if there is the next activity in the sequence, its id should be set as current_activity_id for the given User', async () => {
      ActivitySequenceRepositoryMock.orm.findOne.mockResolvedValueOnce(sequenceWhenThereIsNextActivity);

      await complitedactivityService.compliteActivity(complitedActivity, { user_id });

      expect(UserRepositoryMock.orm.update).toBeCalledWith(user_id, {
        current_activity_id: sequenceWhenThereIsNextActivity.activity_ids[1],
        current_activity_sequence_id: sequenceWhenThereIsNextActivity.id,
      });
    });

    it('positive: if there is no next activity in the sequence, current_activity_id should be set NULL for the given User', async () => {
      ActivitySequenceRepositoryMock.orm.findOne.mockResolvedValueOnce(sequenceWhenThereIsNoNextActivity);

      await complitedactivityService.compliteActivity(complitedActivity, { user_id });

      expect(UserRepositoryMock.orm.update).toBeCalledWith(user_id, {
        current_activity_id: null,
        current_activity_sequence_id: null,
      });
    });

    it('positive: complited activity record should be created', async () => {
      ActivitySequenceRepositoryMock.orm.findOne.mockResolvedValueOnce(sequenceWhenThereIsNextActivity);
      DeviceServiceMock.markAsLeader.mockResolvedValue(LeaderDeviceDummy);

      await complitedactivityService.compliteActivity(complitedActivity, { user_id });

      expect(ComplitedActivityRepositoryMock.create).toBeCalledWith(
        new ComplitedActivity({ ...complitedActivity, user_id }),
      );
    });
  });
});
