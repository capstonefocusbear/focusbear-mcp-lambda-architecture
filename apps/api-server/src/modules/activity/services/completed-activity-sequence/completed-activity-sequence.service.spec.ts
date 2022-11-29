import { Test } from '@nestjs/testing';
import { BadRequestException, NotAcceptableException, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
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
import {
  ActivityDummy,
  ActivitySequenceDummy,
  UncompletedSequenceLogDummy,
  userDummy,
} from '../../../../../test/dummies';
import { CompletedActivitySequence } from '../../entities/completed-activity-sequence.entity';
import { UserRepository } from '../../../user/repositories/user.repository';
import { CompletedActivitySequenceStats } from '../../domain/completed-activity-sequence-stats.model';
import { User } from '../../../user/entities/user.entity';

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

    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(completedActivitySequenceService).toBeDefined();
  });

  describe('getOrCreateCompletingSequenceLog', () => {
    it('positive: if user has current sequence and consistent completing sequence log, should return existing completing_sequence_log', async () => {
      const user: User = {
        ...userDummy,
        current_activity_sequence: ActivitySequenceDummy,
        current_activity_sequence_id: ActivitySequenceDummy.id,
        current_completing_sequence_log_id: UncompletedSequenceLogDummy.id,
        completing_sequence_log: UncompletedSequenceLogDummy,
      };
      const completedActivity = {
        activity_sequence_id: ActivitySequenceDummy.id,
        start_time: new Date(),
        activity_id: randomUUID(),
        duration_logged: Number(),
        device_id: randomUUID(),
      };

      const result = await completedActivitySequenceService.getOrCreateCompletingSequenceLog(
        user,
        completedActivity.activity_sequence_id,
        completedActivity.start_time,
      );

      expect(result).toEqual(user.completing_sequence_log);
    });

    it('positive: if user has no current sequence or completing sequence log is inconsistent, should create new completed sequence log', async () => {
      const user: User = {
        ...userDummy,
        current_activity_sequence: null,
        current_activity_sequence_id: null,
        current_completing_sequence_log_id: null,
        completing_sequence_log: null,
      };
      const completedActivity = {
        activity_sequence_id: ActivitySequenceDummy.id,
        start_time: new Date(),
        activity_id: randomUUID(),
        duration_logged: Number(),
        device_id: randomUUID(),
      };

      await completedActivitySequenceService.getOrCreateCompletingSequenceLog(
        user,
        completedActivity.activity_sequence_id,
        completedActivity.start_time,
      );

      expect(CompletedActivityRepositoryMock.create).toBeCalledWith({
        id: undefined,
        activity_sequence_id: ActivitySequenceDummy.id,
        start_time: completedActivity.start_time,
        user_id: user.id,
        is_completed: false,
      });
    });
  });

  describe('completeActivitySequence', () => {
    it('negative: should throw NotFoundException if there is no uncompleted sequence log to complete', async () => {
      CompletedActivitySequenceRepositoryMock.getUncompletedSequenceLog.mockResolvedValueOnce(null);
      const errorMessage = `There is no uncompleted sequence log with id: ${UncompletedSequenceLogDummy.id}`;
      let exception: any;

      try {
        await completedActivitySequenceService.completeActivitySequence(UncompletedSequenceLogDummy.id, userDummy.id);
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('positive: new completedActivitySequence should be finalized ', async () => {
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(userDummy);
      const log = new CompletedActivitySequence({ ...UncompletedSequenceLogDummy });
      CompletedActivitySequenceRepositoryMock.getUncompletedSequenceLog.mockResolvedValueOnce(log);

      await completedActivitySequenceService.completeActivitySequence(log.id, userDummy.id);

      log.finalizeUncompletedLog();
      expect(CompletedActivitySequenceRepositoryMock.orm.save).toBeCalledWith(log);
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
  });

  describe('forceCompleteCurrentSequence', () => {
    const testUser: User = {
      ...userDummy,
      current_activity_sequence_id: ActivitySequenceDummy.id,
      current_activity_sequence: ActivitySequenceDummy,
      current_activity_id: ActivityDummy.id,
      current_activity: ActivityDummy,
      completing_sequence_log: UncompletedSequenceLogDummy,
    };

    it('negative: if user has another current sequence thorw BadRequestExcaption', async () => {
      const activity_sequence_id = randomUUID();
      const userWithWrongCurrentSequence: User = { ...userDummy, current_activity_sequence_id: randomUUID() };
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(userWithWrongCurrentSequence);
      let exception: any;

      try {
        await completedActivitySequenceService.forceCompleteCurrentSequence(activity_sequence_id, testUser.id);
      } catch (error) {
        exception = error;
      }

      const errorMessage = `Provided sequence with id: ${activity_sequence_id} is not current!`;
      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(BadRequestException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('positive: if user has consistent current sequence, this sequence should be completed', async () => {
      UserRepositoryMock.orm.findOne.mockResolvedValue(testUser);
      UncompletedSequenceLogDummy.finalizeUncompletedLog();
      const spyMethod = jest
        .spyOn(completedActivitySequenceService, 'completeActivitySequence')
        .mockResolvedValue(UncompletedSequenceLogDummy);

      await completedActivitySequenceService.forceCompleteCurrentSequence(
        testUser.current_activity_sequence_id,
        testUser.id,
      );

      expect(spyMethod).toBeCalledWith(testUser.completing_sequence_log.id, testUser.id);
    });

    it('positive: if user has inconsistent current sequence or null values, skip conplete operation and set given id as last completed', async () => {
      UserRepositoryMock.orm.findOne.mockResolvedValue({ ...testUser, current_activity_sequence_id: null });
      UncompletedSequenceLogDummy.finalizeUncompletedLog();
      const spyMethod = jest
        .spyOn(completedActivitySequenceService, 'completeActivitySequence')
        .mockResolvedValue(UncompletedSequenceLogDummy);

      await completedActivitySequenceService.forceCompleteCurrentSequence(
        testUser.current_activity_sequence_id,
        testUser.id,
      );

      expect(spyMethod).not.toBeCalled();
    });

    it('positive: nullified current sequence should be saved for given user', async () => {
      UserRepositoryMock.orm.findOne.mockResolvedValue(testUser);
      UncompletedSequenceLogDummy.finalizeUncompletedLog();
      jest
        .spyOn(completedActivitySequenceService, 'completeActivitySequence')
        .mockResolvedValue(UncompletedSequenceLogDummy);

      await completedActivitySequenceService.forceCompleteCurrentSequence(
        testUser.current_activity_sequence_id,
        testUser.id,
      );

      expect(UserRepositoryMock.update).toBeCalledWith(testUser.id, {
        current_activity_sequence_id: null,
        current_activity_id: null,
        current_activity_assigned_at: null,
        last_completed_sequence_id: testUser.current_activity_sequence_id,
        last_completed_sequence_at: expect.toBeDate(),
        last_completed_sequence_started_at: expect.toBeDate(),
        current_sequence_started_at: null,
        current_completing_sequence_log_id: null,
      });
    });

    it('positive: should nullify current sequence for user if sequence started on current date and "cancel_habits_for_today" is true', async () => {
      UserRepositoryMock.orm.findOne.mockResolvedValue({ ...testUser, current_sequence_started_at: new Date() });
      UncompletedSequenceLogDummy.finalizeUncompletedLog();
      jest
        .spyOn(completedActivitySequenceService, 'completeActivitySequence')
        .mockResolvedValue(UncompletedSequenceLogDummy);

      await completedActivitySequenceService.forceCompleteCurrentSequence(
        testUser.current_activity_sequence_id,
        testUser.id,
        true,
      );

      expect(UserRepositoryMock.update).toBeCalledWith(testUser.id, {
        current_activity_sequence_id: null,
        current_activity_id: null,
        current_activity_assigned_at: null,
        last_completed_sequence_id: testUser.current_activity_sequence_id,
        last_completed_sequence_at: expect.toBeDate(),
        last_completed_sequence_started_at: expect.toBeDate(),
        current_sequence_started_at: null,
        current_completing_sequence_log_id: null,
      });
    });

    it('positive: should return from function if cancel_habits_for_today is false and the current sequence started on current date', async () => {
      UserRepositoryMock.orm.findOne.mockResolvedValue({ ...testUser, current_sequence_started_at: new Date() });
      UncompletedSequenceLogDummy.finalizeUncompletedLog();
      jest
        .spyOn(completedActivitySequenceService, 'completeActivitySequence')
        .mockResolvedValue(UncompletedSequenceLogDummy);
      const responseMessage = `Sequence with ID: ${testUser.current_activity_sequence_id} was started today. Include query param "cancel_habits_for_today" if you intended to clear today's sequence`;
      let exception: any;
      try {
        await completedActivitySequenceService.forceCompleteCurrentSequence(
          testUser.current_activity_sequence_id,
          testUser.id,
          false,
        );
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeInstanceOf(NotAcceptableException);
      expect(exception.message).toMatch(responseMessage);
    });
  });

  describe('nullifyCurrentSequenceSkippedActivities', () => {
    it('positive: should set the users current_sequence_skipped_activities to null', async () => {
      await completedActivitySequenceService.nullifyCurrentSequenceSkippedActivities(userDummy.id);

      expect(UserRepositoryMock.update).toBeCalledWith(userDummy.id, { current_sequence_skipped_activities: null });
    });
  });
});
