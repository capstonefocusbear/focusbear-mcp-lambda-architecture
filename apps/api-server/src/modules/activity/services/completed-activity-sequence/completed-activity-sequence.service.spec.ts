import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  ActivitySequenceRepositoryMock,
  CompletedActivityRepositoryMock,
  CompletedActivitySequenceRepositoryMock,
} from '../../../../../test/mocks';
import { ActivitySequenceRepository } from '../../repositories/activity-sequence.repository';
import { CompletedActivityRepository } from '../../repositories/completed-activity.repository';
import { CompletedActivitySequenceRepository } from '../../repositories/completed-activity-sequence.repository';
import { CompletedActivitySequenceService } from './completed-activity-sequence.service';
import { ActivitySequenceDummy, CompletedActivitiesForSequenceDummy } from '../../../../../test/dummies ';
import { CompletedActivitySequence } from '../../entities/completed-activity-sequence.entity';

describe('CompletedActivitySequenceService', () => {
  let completedActivitySequenceService: CompletedActivitySequenceService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        CompletedActivitySequenceService,
        CompletedActivitySequenceRepository,
        CompletedActivityRepository,
        ActivitySequenceRepository,
      ],
    })
      .overrideProvider(CompletedActivitySequenceRepository)
      .useValue(CompletedActivitySequenceRepositoryMock)
      .overrideProvider(CompletedActivityRepository)
      .useValue(CompletedActivityRepositoryMock)
      .overrideProvider(ActivitySequenceRepository)
      .useValue(ActivitySequenceRepositoryMock)
      .compile();

    completedActivitySequenceService = moduleRef.get<CompletedActivitySequenceService>(
      CompletedActivitySequenceService,
    );
  });

  it('should be defined', () => {
    expect(completedActivitySequenceService).toBeDefined();
  });

  describe('compliteActivitySequence', () => {
    const activity_sequence_id = ActivitySequenceDummy.id;
    const { user_id } = ActivitySequenceDummy;

    it('negative: should throw NotFoundException if activity_sequence does not exist', async () => {
      ActivitySequenceRepositoryMock.orm.findOne.mockResolvedValueOnce(null);
      const errorMessage = `Activity Sequence with id: ${activity_sequence_id} does not exist!`;
      let exception: any;

      try {
        await completedActivitySequenceService.compliteActivitySequence(activity_sequence_id, user_id);
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('negative: should throw BadRequestException if no completed logs for all activities in the sequence (no logs at all)', async () => {
      ActivitySequenceRepositoryMock.orm.findOne.mockResolvedValueOnce(ActivitySequenceDummy);
      CompletedActivitySequenceRepositoryMock.getMostRecentCompletedTime.mockResolvedValueOnce(
        new Date(Date.now() - 100),
      );
      CompletedActivityRepositoryMock.findInSequenceAfterTime.mockResolvedValueOnce([]); // no logs at all
      const errorMessage = `Unable to complete sequence, no completed log for activity with id: ${ActivitySequenceDummy.activity_ids[0]}, order: 0!`;
      let exception: any;

      try {
        await completedActivitySequenceService.compliteActivitySequence(activity_sequence_id, user_id);
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(BadRequestException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('negative: should throw BadRequestException if no completed logs for all activities in the sequence (missed log for second item in the sequence)', async () => {
      ActivitySequenceRepositoryMock.orm.findOne.mockResolvedValueOnce(ActivitySequenceDummy);
      CompletedActivitySequenceRepositoryMock.getMostRecentCompletedTime.mockResolvedValueOnce(
        new Date(Date.now() - 100),
      );
      const completedActivities = CompletedActivitiesForSequenceDummy(ActivitySequenceDummy);
      completedActivities[1] = null;
      CompletedActivityRepositoryMock.findInSequenceAfterTime.mockResolvedValueOnce(completedActivities); // no logs for second item in sequence
      const errorMessage = `Unable to complete sequence, no completed log for activity with id: ${ActivitySequenceDummy.activity_ids[1]}, order: 1!`;
      let exception: any;

      try {
        await completedActivitySequenceService.compliteActivitySequence(activity_sequence_id, user_id);
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(BadRequestException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('positive: total duration should be calculated in timerange from first activity in the sequence to the last one', async () => {
      ActivitySequenceRepositoryMock.orm.findOne.mockResolvedValueOnce(ActivitySequenceDummy);
      CompletedActivitySequenceRepositoryMock.getMostRecentCompletedTime.mockResolvedValueOnce(
        new Date(Date.now() - 100),
      );
      const completedActivities = CompletedActivitiesForSequenceDummy(ActivitySequenceDummy);
      CompletedActivityRepositoryMock.findInSequenceAfterTime.mockResolvedValueOnce(completedActivities);

      await completedActivitySequenceService.compliteActivitySequence(activity_sequence_id, user_id);

      const timeRange = {
        start_time: completedActivities[0].finish_time,
        finish_time: completedActivities[completedActivities.length - 1].finish_time,
      };
      expect(CompletedActivityRepositoryMock.getTotalDurationsPerTimeRange).toBeCalledWith(
        ActivitySequenceDummy.activity_ids,
        timeRange,
      );
    });

    it('positive: new completedActivitySequence should be created ', async () => {
      ActivitySequenceRepositoryMock.orm.findOne.mockResolvedValueOnce(ActivitySequenceDummy);
      CompletedActivitySequenceRepositoryMock.getMostRecentCompletedTime.mockResolvedValueOnce(
        new Date(Date.now() - 100),
      );
      const completedActivities = CompletedActivitiesForSequenceDummy(ActivitySequenceDummy);
      CompletedActivityRepositoryMock.findInSequenceAfterTime.mockResolvedValueOnce(completedActivities);
      const totalDuration = '1000';
      CompletedActivityRepositoryMock.getTotalDurationsPerTimeRange.mockResolvedValueOnce(totalDuration);

      await completedActivitySequenceService.compliteActivitySequence(activity_sequence_id, user_id);

      expect(CompletedActivitySequenceRepositoryMock.create).toBeCalledWith(
        new CompletedActivitySequence({
          user_id,
          activity_sequence_id,
          start_time: completedActivities[0].start_time,
          finish_time: completedActivities[completedActivities.length - 1].finish_time,
          duration_minutes: Number(totalDuration) / 60,
        }),
      );
    });
  });
});
