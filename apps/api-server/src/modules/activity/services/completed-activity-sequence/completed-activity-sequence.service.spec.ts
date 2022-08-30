import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  ActivitySequenceRepositoryMock,
  CompletedActivityRepositoryMock,
  CompletedActivitySequenceRepositoryMock,
  UserRepositoryMock,
} from '../../../../../test/mocks';
import { ActivitySequenceRepository } from '../../repositories/activity-sequence.repository';
import { CompletedActivityRepository } from '../../repositories/completed-activity.repository';
import { CompletedActivitySequenceRepository } from '../../repositories/completed-activity-sequence.repository';
import { CompletedActivitySequenceService } from './completed-activity-sequence.service';
import { ActivitySequenceDummy, CompletedActivitiesForSequenceDummy, userDummy } from '../../../../../test/dummies ';
import { CompletedActivitySequence } from '../../entities/completed-activity-sequence.entity';
import { UserRepository } from '../../../user/repositories/user.repository';
import { CompletedActivitySequenceStats } from '../../domain/completed-activity-sequence-stats.model';

describe('CompletedActivitySequenceService', () => {
  let completedActivitySequenceService: CompletedActivitySequenceService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        CompletedActivitySequenceService,
        CompletedActivitySequenceRepository,
        CompletedActivityRepository,
        ActivitySequenceRepository,
        UserRepository,
      ],
    })
      .overrideProvider(CompletedActivitySequenceRepository)
      .useValue(CompletedActivitySequenceRepositoryMock)
      .overrideProvider(CompletedActivityRepository)
      .useValue(CompletedActivityRepositoryMock)
      .overrideProvider(ActivitySequenceRepository)
      .useValue(ActivitySequenceRepositoryMock)
      .overrideProvider(UserRepository)
      .useValue(UserRepositoryMock)
      .compile();

    completedActivitySequenceService = moduleRef.get<CompletedActivitySequenceService>(
      CompletedActivitySequenceService,
    );
  });

  it('should be defined', () => {
    expect(completedActivitySequenceService).toBeDefined();
  });

  describe('completeActivitySequence', () => {
    const activity_sequence_id = ActivitySequenceDummy.id;
    const { user_id } = ActivitySequenceDummy;

    it('negative: should throw NotFoundException if activity_sequence does not exist', async () => {
      ActivitySequenceRepositoryMock.orm.findOne.mockResolvedValueOnce(null);
      const errorMessage = `Activity Sequence with id: ${activity_sequence_id} does not exist!`;
      let exception: any;

      try {
        await completedActivitySequenceService.completeActivitySequence(activity_sequence_id, user_id);
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
        await completedActivitySequenceService.completeActivitySequence(activity_sequence_id, user_id);
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
        await completedActivitySequenceService.completeActivitySequence(activity_sequence_id, user_id);
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

      await completedActivitySequenceService.completeActivitySequence(activity_sequence_id, user_id);

      const timeRange = {
        start_time: completedActivities[0].finish_time,
        finish_time: completedActivities[completedActivities.length - 1].finish_time,
      };
      expect(CompletedActivityRepositoryMock.getTotalDurationsPerTimeRange).toBeCalledWith(
        ActivitySequenceDummy.sequenceActivityIds,
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

      await completedActivitySequenceService.completeActivitySequence(activity_sequence_id, user_id);

      const duration_minutes = Number(totalDuration) / 60;
      const plan_duration_minutes = ActivitySequenceDummy.sequenceDurationMinutes;
      expect(CompletedActivitySequenceRepositoryMock.create).toBeCalledWith(
        new CompletedActivitySequence({
          user_id,
          activity_sequence_id,
          start_time: completedActivities[0].start_time,
          finish_time: completedActivities[completedActivities.length - 1].finish_time,
          duration_minutes,
          plan_duration_minutes,
          duration_percent_deviation: Math.round((plan_duration_minutes / duration_minutes) * 100 - 100),
        }),
      );
    });
  });

  describe('getStatsByActivitySequencePerDay', () => {
    const activity_sequence_id = ActivitySequenceDummy.id;
    const days_number = 30;
    const timezone = 'UTC';
    const user_id = userDummy.id;

    it('negative: should throw NotFoundException if activity_sequence does not exist for user', async () => {
      ActivitySequenceRepositoryMock.findOneByIdForUser.mockResolvedValueOnce(null);
      const errorMessage = `Activity Sequence with id: ${activity_sequence_id} does not exist for User with id: ${user_id}!`;
      let exception: any;

      try {
        await completedActivitySequenceService.getStatsByActivitySequencePerDay(
          { activity_sequence_id },
          { days_number, timezone },
          user_id,
        );
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('positive: should return instance of CompletedActivitySequenceStats', async () => {
      ActivitySequenceRepositoryMock.findOneByIdForUser.mockResolvedValueOnce(ActivitySequenceDummy);
      const statItemsDummy = [{ date: new Date(Date.now()), summary: '6', average_duration_percent_deviation: -5 }];
      CompletedActivitySequenceRepositoryMock.getAggregatedDurationLogsPerDay.mockResolvedValueOnce(statItemsDummy);

      const result = await completedActivitySequenceService.getStatsByActivitySequencePerDay(
        { activity_sequence_id },
        { days_number, timezone },
        user_id,
      );

      expect(result).toBeDefined();
      expect(result).toBeInstanceOf(CompletedActivitySequenceStats);
      expect(result.activity_sequence_id).toEqual(activity_sequence_id);
      expect(result.days_number).toEqual(days_number);
      expect(result.average_completion_percent).toEqual(100);
      expect(result.daily_durations_minutes.length).toEqual(1);
      expect(result.daily_durations_minutes[0].date).toEqual(statItemsDummy[0].date);
      expect(result.daily_durations_minutes[0].summary).toEqual(statItemsDummy[0].summary);
    });

    // it('positive: if sequence type is "break", total planning duration should be counted as "breaks * sequence_duration"', async () => {
    //   const breakTypeActivitySequence = { ...ActivitySequenceDummy, type: ActivityType.break };
    //   ActivitySequenceRepositoryMock.findOneByIdForUser.mockResolvedValueOnce(breakTypeActivitySequence);
    //   const statItemsDummy = [
    //     { date: new Date(Date.now()), summary: '6' },
    //     { date: new Date(Date.now() - 1000), summary: '6' },
    //   ];
    //   CompletedActivitySequenceRepositoryMock.getAggregatedDurationLogsPerDay.mockResolvedValueOnce(statItemsDummy);
    //   UserRepositoryMock.orm.findOne.mockResolvedValueOnce(userDummy);

    //   const result = await completedActivitySequenceService.getStatsByActivitySequencePerDay(
    //     { activity_sequence_id },
    //     { days_number, timezone },
    //     user_id,
    //   );

    //   expect(result).toBeDefined();
    //   expect(result).toBeInstanceOf(CompletedActivitySequenceStats);
    //   expect(result.average_completion_percent).toEqual(0);
    // });
  });
});
