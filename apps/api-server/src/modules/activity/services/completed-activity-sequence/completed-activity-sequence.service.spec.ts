import { Test } from '@nestjs/testing';
import { BadRequestException, NotAcceptableException, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { SENTRY_TOKEN } from '@ntegral/nestjs-sentry';
import {
  ActivitySequenceRepositoryMock,
  CompletedActivityRepositoryMock,
  CompletedActivitySequenceRepositoryMock,
  SentryServiceMock,
  UserRepositoryMock,
} from '../../../../../test/mocks';
import { ActivitySequenceRepository } from '../../repositories/activity-sequence.repository';
import { CompletedActivityRepository } from '../../repositories/completed-activity.repository';
import { CompletedActivitySequenceRepository } from '../../repositories/completed-activity-sequence.repository';
import { CompletedActivitySequenceService } from './completed-activity-sequence.service';
import {
  ActivityDummy,
  ActivitySequenceDummy,
  CompletedSequenceLogDummy,
  UncompletedSequenceLogDummy,
  userDummy,
} from '../../../../../test/dummies';
import { CompletedActivitySequence } from '../../entities/completed-activity-sequence.entity';
import { UserRepository } from '../../../user/repositories/user.repository';
import { CompletedActivitySequenceStats } from '../../domain/completed-activity-sequence-stats.model';
import { User } from '../../../user/entities/user.entity';
import { ActivityType } from '../../domain/activity-type.enum';

describe('CompletedActivitySequenceService', () => {
  let completedActivitySequenceService: CompletedActivitySequenceService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        CompletedActivitySequenceService,
        CompletedActivitySequenceRepository,
        CompletedActivityRepository,
        ActivitySequenceRepository,
        UserRepository,
        {
          provide: SENTRY_TOKEN,
          useValue: SentryServiceMock,
        },
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

  beforeEach(() => {
    jest.resetAllMocks();
    jest.clearAllMocks();
    jest.useRealTimers();
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

  describe('getOrCreateCompletingSequenceLogForSyncing', () => {
    it('positive: should create new sequence if no incomplete or complete sequence is found for activity date', async () => {
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
      CompletedActivitySequenceRepositoryMock.orm.findOne.mockResolvedValueOnce(null);
      CompletedActivitySequenceRepositoryMock.orm.findOne.mockResolvedValueOnce(null);

      await completedActivitySequenceService.getOrCreateCompletingSequenceLogForSyncing(
        user,
        completedActivity.activity_sequence_id,
        completedActivity.start_time,
      );

      expect(CompletedActivitySequenceRepositoryMock.create).toBeCalledWith({
        id: undefined,
        activity_sequence_id: ActivitySequenceDummy.id,
        start_time: completedActivity.start_time,
        user_id: user.id,
        is_completed: false,
      });
    });

    it('positive: if incomplete sequence from activity date is found it should be returned', async () => {
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
      CompletedActivitySequenceRepositoryMock.orm.findOne.mockResolvedValueOnce(UncompletedSequenceLogDummy);

      const result = await completedActivitySequenceService.getOrCreateCompletingSequenceLogForSyncing(
        user,
        completedActivity.activity_sequence_id,
        completedActivity.start_time,
      );

      expect(result).toBe(UncompletedSequenceLogDummy);
    });

    it('positive: if complete sequence from activity date is found it should be returned', async () => {
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
      CompletedActivitySequenceRepositoryMock.orm.findOne.mockResolvedValueOnce(null);
      CompletedActivitySequenceRepositoryMock.orm.findOne.mockResolvedValueOnce(CompletedSequenceLogDummy);

      const result = await completedActivitySequenceService.getOrCreateCompletingSequenceLogForSyncing(
        user,
        completedActivity.activity_sequence_id,
        completedActivity.start_time,
      );

      expect(result).toBe(CompletedSequenceLogDummy);
    });
  });

  describe('completeActivitySequence', () => {
    it('positive: new completedActivitySequence should be finalized ', async () => {
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(userDummy);
      const log = new CompletedActivitySequence({ ...UncompletedSequenceLogDummy });
      CompletedActivitySequenceRepositoryMock.getUncompletedSequenceLog.mockResolvedValueOnce(log);

      await completedActivitySequenceService.completeActivitySequence(log.id, userDummy.id);

      log.finalizeUncompletedLog();
      expect(CompletedActivitySequenceRepositoryMock.orm.save).toBeCalledWith(log);
    });

    it('guard: should NOT finalize if sequence has zero non-skipped logs (only true skips)', async () => {
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(userDummy);
      const emptyLog = new CompletedActivitySequence({
        ...UncompletedSequenceLogDummy,
        completed_activity_logs: [{ metadata: { is_skipped: true } }, { metadata: { skipped_did_not_complete: true } }],
      } as any);
      CompletedActivitySequenceRepositoryMock.getUncompletedSequenceLog.mockResolvedValueOnce(emptyLog);

      await completedActivitySequenceService.completeActivitySequence(emptyLog.id, userDummy.id);

      // Should not finalize/save the sequence
      expect(CompletedActivitySequenceRepositoryMock.orm.save).not.toBeCalled();
      // But should still clear skipped list for the user
      expect(UserRepositoryMock.update).toBeCalledWith(userDummy.id, { current_sequence_skipped_activities: null });
    });

    it('positive: should finalize if there is at least one "did already" log (skipped_did_complete)', async () => {
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(userDummy);
      const logWithDidAlready = new CompletedActivitySequence({
        ...UncompletedSequenceLogDummy,
        completed_activity_logs: [
          { metadata: { is_skipped: true } },
          { metadata: { skipped_did_complete: true } }, // counts as completion
          { metadata: { skipped_did_not_complete: true } },
        ],
      } as any);
      CompletedActivitySequenceRepositoryMock.getUncompletedSequenceLog.mockResolvedValueOnce(logWithDidAlready);

      await completedActivitySequenceService.completeActivitySequence(logWithDidAlready.id, userDummy.id);

      expect(CompletedActivitySequenceRepositoryMock.orm.save).toBeCalled();
    });
  });

  describe('completeActivitySequenceByDate', () => {
    it('positive: sequence should be completed and saved', async () => {
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(userDummy);
      const log = new CompletedActivitySequence({ ...UncompletedSequenceLogDummy });
      const startTime = new Date();
      CompletedActivitySequenceRepositoryMock.getSequenceLogByDate.mockResolvedValueOnce(log);

      await completedActivitySequenceService.completeActivitySequenceByDate(log.id, userDummy.id, startTime);

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

    it('negative: if user has another current sequence throw BadRequestException', async () => {
      const activity_sequence_id = randomUUID();
      const userWithWrongCurrentSequence: User = { ...userDummy, current_activity_sequence_id: randomUUID() };
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(userWithWrongCurrentSequence);
      ActivitySequenceRepositoryMock.orm.findOneBy.mockResolvedValueOnce(ActivitySequenceDummy);
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

    it('negative: if user has no current sequence throw BadRequestException', async () => {
      const activity_sequence_id = randomUUID();
      const userWithWrongCurrentSequence: User = { ...userDummy, current_activity_sequence_id: null };
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(userWithWrongCurrentSequence);
      ActivitySequenceRepositoryMock.orm.findOneBy.mockResolvedValueOnce(ActivitySequenceDummy);
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

    it('negative: should throw error if cancel_habits_for_today is false and the current sequence started on current date', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2022-10-06T12:00:00.000Z'));
      UserRepositoryMock.orm.findOne.mockResolvedValue({
        ...testUser,
        current_sequence_started_at: new Date('2022-10-06T12:00:00.000Z'),
      });
      ActivitySequenceRepositoryMock.orm.findOneBy.mockResolvedValueOnce(ActivitySequenceDummy);
      ActivitySequenceRepositoryMock.orm.findOneBy.mockResolvedValueOnce(ActivitySequenceDummy);
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
      jest.useRealTimers();
    });

    it("negative: should throw error if cancel_habits_for_today is false, current sequence started on current date, and it's not time for next sequence yet", async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2022-10-06T12:00:00.000Z'));
      UserRepositoryMock.orm.findOne.mockResolvedValue({
        ...testUser,
        startup_time: '08:00',
        shutdown_time: '18:00',
        current_sequence_started_at: new Date('2022-10-06T08:00:00.000Z'),
      });
      ActivitySequenceRepositoryMock.orm.findOneBy.mockResolvedValueOnce(ActivitySequenceDummy);
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
      jest.useRealTimers();
    });

    it('negative: should not allow force completion if cancel_habits_for_today is false, user has no current_sequence_started_at or current_activity_assigned_at values, current sequence and incoming sequence are of the same type', async () => {
      UserRepositoryMock.orm.findOne.mockResolvedValue({
        ...testUser,
        current_sequence_started_at: null,
        current_activity_assigned_at: null,
      });
      ActivitySequenceRepositoryMock.orm.findOneBy.mockResolvedValueOnce(ActivitySequenceDummy);
      ActivitySequenceRepositoryMock.orm.findOneBy.mockResolvedValueOnce(ActivitySequenceDummy);
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

    it("positive: should force complete sequence if cancel_habits_for_today is false, user has no current_sequence_started_at or current_activity_assigned_at values, but current sequence and incoming sequence aren't of the same type", async () => {
      UserRepositoryMock.orm.findOne.mockResolvedValue({
        ...testUser,
        current_sequence_started_at: null,
        current_activity_assigned_at: null,
      });
      UncompletedSequenceLogDummy.finalizeUncompletedLog();
      ActivitySequenceRepositoryMock.orm.findOneBy.mockResolvedValueOnce({
        ...ActivitySequenceDummy,
        type: ActivityType.evening,
      });
      ActivitySequenceRepositoryMock.orm.findOneBy.mockResolvedValueOnce(ActivitySequenceDummy);
      const spyMethod = jest
        .spyOn(completedActivitySequenceService, 'completeActivitySequence')
        .mockResolvedValue(UncompletedSequenceLogDummy);

      await completedActivitySequenceService.forceCompleteCurrentSequence(
        testUser.current_activity_sequence_id,
        testUser.id,
        true,
      );

      expect(spyMethod).toBeCalledWith(testUser.completing_sequence_log.id, testUser.id);
    });

    it('positive: if user has consistent current sequence, this sequence should be completed', async () => {
      UserRepositoryMock.orm.findOne.mockResolvedValue({ ...testUser, current_sequence_started_at: new Date() });
      UncompletedSequenceLogDummy.finalizeUncompletedLog();
      ActivitySequenceRepositoryMock.orm.findOneBy.mockResolvedValueOnce(ActivitySequenceDummy);
      const spyMethod = jest
        .spyOn(completedActivitySequenceService, 'completeActivitySequence')
        .mockResolvedValue(UncompletedSequenceLogDummy);

      await completedActivitySequenceService.forceCompleteCurrentSequence(
        testUser.current_activity_sequence_id,
        testUser.id,
        true,
      );

      expect(spyMethod).toBeCalledWith(testUser.completing_sequence_log.id, testUser.id);
    });

    it('positive: nullified current sequence should be saved for given user', async () => {
      UserRepositoryMock.orm.findOne.mockResolvedValue({ ...testUser, current_sequence_started_at: new Date() });
      ActivitySequenceRepositoryMock.orm.findOneBy.mockResolvedValueOnce(ActivitySequenceDummy);
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
        has_received_inactivity_warning: false,
        updated_at: expect.toBeDateString(),
      });
    });

    it('positive: should nullify current sequence for user if sequence started on current date and "cancel_habits_for_today" is true', async () => {
      UserRepositoryMock.orm.findOne.mockResolvedValue({
        ...testUser,
        current_sequence_started_at: new Date(),
      });
      ActivitySequenceRepositoryMock.orm.findOneBy.mockResolvedValueOnce(ActivitySequenceDummy);
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
        has_received_inactivity_warning: false,
        updated_at: expect.toBeDateString(),
      });
    });

    it('positive: should nullify current sequence for user if sequence was started on a date before current date', async () => {
      UserRepositoryMock.orm.findOne.mockResolvedValue({
        ...testUser,
        current_sequence_started_at: new Date('2022-06-10T20:30:49.293+00:00'),
      });
      ActivitySequenceRepositoryMock.orm.findOneBy.mockResolvedValueOnce(ActivitySequenceDummy);
      UncompletedSequenceLogDummy.finalizeUncompletedLog();
      jest
        .spyOn(completedActivitySequenceService, 'completeActivitySequence')
        .mockResolvedValue(UncompletedSequenceLogDummy);

      await completedActivitySequenceService.forceCompleteCurrentSequence(
        testUser.current_activity_sequence_id,
        testUser.id,
        false,
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
        has_received_inactivity_warning: false,
        updated_at: expect.toBeDateString(),
      });
    });

    it('positive: should nullify current sequence for user if existing sequence is morning and evening sequence has started with "cancel_habits_for_today" as false', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2022-10-06T18:05:00.000Z'));
      UserRepositoryMock.orm.findOne.mockResolvedValue({
        ...testUser,
        startup_time: '08:00',
        shutdown_time: '18:00',
        current_sequence_started_at: new Date('2022-10-06T08:30:00.000+00:00'),
      });
      ActivitySequenceRepositoryMock.orm.findOneBy.mockResolvedValueOnce(ActivitySequenceDummy);
      UncompletedSequenceLogDummy.finalizeUncompletedLog();
      jest
        .spyOn(completedActivitySequenceService, 'completeActivitySequence')
        .mockResolvedValue(UncompletedSequenceLogDummy);
      await completedActivitySequenceService.forceCompleteCurrentSequence(
        testUser.current_activity_sequence_id,
        testUser.id,
        false,
      );

      expect(UserRepositoryMock.update).toBeCalledWith(testUser.id, {
        current_activity_sequence_id: null,
        current_activity_id: null,
        current_activity_assigned_at: null,
        last_completed_sequence_id: testUser.current_activity_sequence_id,
        last_completed_sequence_at: new Date('2022-10-06T18:05:00.000Z'),
        last_completed_sequence_started_at: new Date('2022-10-06T08:30:00.000Z'),
        current_sequence_started_at: null,
        current_completing_sequence_log_id: null,
        has_received_inactivity_warning: false,
        updated_at: '2022-10-06T18:05:00.000Z',
      });
      jest.useRealTimers();
    });

    it('positive: should nullify current sequence for user if existing sequence is evening and morning sequence has started with "cancel_habits_for_today" as false(evening sequence is after 12PM)', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2022-10-06T08:05:00.000Z'));
      UserRepositoryMock.orm.findOne.mockResolvedValue({
        ...testUser,
        startup_time: '08:00',
        shutdown_time: '02:00',
        current_sequence_started_at: new Date('2022-10-06T02:05:00.000+00:00'),
      });
      ActivitySequenceRepositoryMock.orm.findOneBy.mockResolvedValueOnce({
        ...ActivitySequenceDummy,
        type: ActivityType.evening,
      });
      UncompletedSequenceLogDummy.finalizeUncompletedLog();
      jest
        .spyOn(completedActivitySequenceService, 'completeActivitySequence')
        .mockResolvedValue(UncompletedSequenceLogDummy);

      await completedActivitySequenceService.forceCompleteCurrentSequence(
        testUser.current_activity_sequence_id,
        testUser.id,
        false,
      );

      expect(UserRepositoryMock.update).toBeCalledWith(testUser.id, {
        current_activity_sequence_id: null,
        current_activity_id: null,
        current_activity_assigned_at: null,
        last_completed_sequence_id: testUser.current_activity_sequence_id,
        last_completed_sequence_at: new Date('2022-10-06T08:05:00.000Z'),
        last_completed_sequence_started_at: new Date('2022-10-06T02:05:00.000Z'),
        current_sequence_started_at: null,
        current_completing_sequence_log_id: null,
        has_received_inactivity_warning: false,
        updated_at: '2022-10-06T08:05:00.000Z',
      });
      jest.useRealTimers();
    });

    it('positive: should nullify current sequence for user if existing sequence is morning and evening sequence has started with "cancel_habits_for_today" as false (timezone: America/New_York || UTC-05:00)', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2022-10-06T23:05:00.000Z'));
      UserRepositoryMock.orm.findOne.mockResolvedValue({
        ...testUser,
        timezone: 'UTC-05:00',
        startup_time: '08:00',
        shutdown_time: '18:00',
        // 6:01 pm in New York
        current_sequence_started_at: new Date('2022-10-06T23:01:00.000+00:00'),
      });
      ActivitySequenceRepositoryMock.orm.findOneBy.mockResolvedValueOnce(ActivitySequenceDummy);
      UncompletedSequenceLogDummy.finalizeUncompletedLog();
      jest
        .spyOn(completedActivitySequenceService, 'completeActivitySequence')
        .mockResolvedValue(UncompletedSequenceLogDummy);
      await completedActivitySequenceService.forceCompleteCurrentSequence(
        testUser.current_activity_sequence_id,
        testUser.id,
        false,
      );

      expect(UserRepositoryMock.update).toBeCalledWith(testUser.id, {
        current_activity_sequence_id: null,
        current_activity_id: null,
        current_activity_assigned_at: null,
        last_completed_sequence_id: testUser.current_activity_sequence_id,
        last_completed_sequence_at: new Date('2022-10-06T23:05:00.000Z'),
        last_completed_sequence_started_at: new Date('2022-10-06T23:01:00.000Z'),
        current_sequence_started_at: null,
        current_completing_sequence_log_id: null,
        has_received_inactivity_warning: false,
        updated_at: '2022-10-06T23:05:00.000Z',
      });
      jest.useRealTimers();
    });

    it('positive: should nullify current sequence for user if existing sequence is morning and evening sequence has started with "cancel_habits_for_today" as false (timezone: Australia/Melbourne || UTC+11:00)', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2022-10-06T07:05:00.000Z'));
      UserRepositoryMock.orm.findOne.mockResolvedValue({
        ...testUser,
        timezone: 'UTC+11:00',
        startup_time: '08:00',
        shutdown_time: '18:00',
        // 7:30 pm in Melbourne
        current_sequence_started_at: new Date('2022-10-06T08:30:00.000+00:00'),
      });
      ActivitySequenceRepositoryMock.orm.findOneBy.mockResolvedValueOnce(ActivitySequenceDummy);
      UncompletedSequenceLogDummy.finalizeUncompletedLog();
      jest
        .spyOn(completedActivitySequenceService, 'completeActivitySequence')
        .mockResolvedValue(UncompletedSequenceLogDummy);
      await completedActivitySequenceService.forceCompleteCurrentSequence(
        testUser.current_activity_sequence_id,
        testUser.id,
        false,
      );

      expect(UserRepositoryMock.update).toBeCalledWith(testUser.id, {
        current_activity_sequence_id: null,
        current_activity_id: null,
        current_activity_assigned_at: null,
        last_completed_sequence_id: testUser.current_activity_sequence_id,
        last_completed_sequence_at: new Date('2022-10-06T07:05:00.000Z'),
        last_completed_sequence_started_at: new Date('2022-10-06T08:30:00.000Z'),
        current_sequence_started_at: null,
        current_completing_sequence_log_id: null,
        has_received_inactivity_warning: false,
        updated_at: '2022-10-06T07:05:00.000Z',
      });
      jest.useRealTimers();
    });

    it('positive: if user does not have current sequence and cancel_habits_for_today is true, completed record should be created for skipped routine', async () => {
      UserRepositoryMock.orm.findOne.mockResolvedValue({
        ...testUser,
        completing_sequence_log: null,
        current_activity_sequence_id: null,
      });
      ActivitySequenceRepositoryMock.orm.findOneBy.mockResolvedValueOnce(ActivitySequenceDummy);
      jest.spyOn(completedActivitySequenceService, 'completeActivitySequence').mockResolvedValue(null);

      await completedActivitySequenceService.forceCompleteCurrentSequence(ActivitySequenceDummy.id, testUser.id, true);

      expect(CompletedActivitySequenceRepositoryMock.create).toBeCalledWith(
        new CompletedActivitySequence({
          activity_sequence_id: ActivitySequenceDummy.id,
          user_id: testUser.id,
          start_time: expect.toBeDate(),
          finish_time: expect.toBeDate(),
          is_completed: true,
          duration_minutes: 0,
        }),
      );
      expect(UserRepositoryMock.update).toBeCalledWith(testUser.id, {
        current_activity_sequence_id: null,
        current_activity_id: null,
        current_activity_assigned_at: null,
        last_completed_sequence_id: ActivitySequenceDummy.id,
        last_completed_sequence_at: expect.toBeDate(),
        last_completed_sequence_started_at: expect.toBeDate(),
        current_sequence_started_at: null,
        current_completing_sequence_log_id: null,
        has_received_inactivity_warning: false,
        updated_at: expect.toBeDateString(),
      });
    });
  });

  describe('nullifyCurrentSequenceSkippedActivities', () => {
    it('positive: should set the users current_sequence_skipped_activities to null', async () => {
      await completedActivitySequenceService.nullifyCurrentSequenceSkippedActivities(userDummy.id);

      expect(UserRepositoryMock.update).toBeCalledWith(userDummy.id, { current_sequence_skipped_activities: null });
    });
  });

  describe('getRoutinesProgress', () => {
    it('should return correct routine progress for all statuses', async () => {
      const userId = userDummy.id;
      const morningSequence = {
        ...ActivitySequenceDummy,
        id: 'morning-seq-id',
        type: ActivityType.morning,
        activity_ids: ['a1', 'a2'],
      };
      const eveningSequence = {
        ...ActivitySequenceDummy,
        id: 'evening-seq-id',
        type: ActivityType.evening,
        activity_ids: ['e1'],
      };
      const customSequence = {
        ...ActivitySequenceDummy,
        id: 'custom-seq-id',
        type: ActivityType.standalone,
        activity_ids: ['c1', 'c2'],
        custom_routine_id: 'some-custom-id', // <- important
      };

      const standaloneSequence = {
        ...ActivitySequenceDummy,
        id: 'standalone-seq-id',
        type: ActivityType.standalone,
        activity_ids: ['s1', 's2'],
        custom_routine_id: null, // <- important
      };

      const user = {
        ...userDummy,
        current_activity_sequence_id: 'custom-seq-id',
      };

      const completedMorning = {
        activity_sequence_id: 'morning-seq-id',
        is_completed: true,
        completed_activity_logs: [],
      };

      const completedCustom = {
        activity_sequence_id: 'custom-seq-id',
        is_completed: false,
        completed_activity_logs: [{ activity_id: 'c1' }],
      };

      const completedEvening = {
        activity_sequence_id: 'evening-seq-id',
        is_completed: false,
        completed_activity_logs: [{ activity_id: 'e1' }],
      };

      const completedStandalone = {
        activity_sequence_id: 'standalone-seq-id',
        is_completed: false,
        completed_activity_logs: [{ activity_id: 's1' }],
      };

      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(user);
      ActivitySequenceRepositoryMock.orm.find.mockResolvedValueOnce([
        morningSequence,
        eveningSequence,
        customSequence,
        standaloneSequence,
      ]);
      CompletedActivitySequenceRepositoryMock.getTodaySequences.mockResolvedValueOnce([
        completedMorning,
        completedCustom,
        completedEvening,
        completedStandalone,
      ]);

      const result = await completedActivitySequenceService.getRoutinesProgress(userId, 'UTC');

      expect(result).toEqual({
        morning_routine: {
          sequence_id: 'morning-seq-id',
          status: 'completed',
        },
        evening_routine: {
          sequence_id: 'evening-seq-id',
          status: 'postponed',
          completed_habit_ids: ['e1'],
        },
        custom_routines: [
          {
            sequence_id: 'custom-seq-id',
            status: 'in_progress',
            completed_habit_ids: ['c1'],
          },
        ],
        standalone_routines: [
          {
            sequence_id: 'standalone-seq-id',
            status: 'postponed',
            completed_habit_ids: ['s1'],
          },
        ],
      });
    });

    it('should exclude routines that have no progress and are not active', async () => {
      const userId = userDummy.id;
      const idleSequence = {
        ...ActivitySequenceDummy,
        id: 'idle-seq-id',
        type: ActivityType.standalone,
        activity_ids: ['x1'],
        custom_routine_id: null,
      };

      const user = {
        ...userDummy,
        current_activity_sequence_id: null,
      };

      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(user);
      ActivitySequenceRepositoryMock.orm.find.mockResolvedValueOnce([idleSequence]);
      CompletedActivitySequenceRepositoryMock.getTodaySequences.mockResolvedValueOnce([]);

      const result = await completedActivitySequenceService.getRoutinesProgress(userId, 'UTC');

      expect(result).toEqual({
        morning_routine: null,
        evening_routine: null,
        custom_routines: [],
        standalone_routines: [],
      });
    });
  });
});

describe('CompletedActivitySequenceService() test', () => {
  let service: CompletedActivitySequenceService;
  let completedRepo: any;
  let activitySequenceRepo: any;
  let userRepo: any;
  let sentry: any;

  beforeEach(() => {
    completedRepo = {
      orm: {
        findOne: jest.fn(),
        save: jest.fn(),
      },
      create: jest.fn(),
    };
    activitySequenceRepo = {};
    userRepo = {};
    sentry = {
      instance: () => ({
        addBreadcrumb: jest.fn(),
        captureException: jest.fn(),
      }),
    };

    service = new CompletedActivitySequenceService(
      completedRepo as any,
      activitySequenceRepo as any,
      userRepo as any,
      sentry as any,
    );

    jest.clearAllMocks();
  });

  const makeUser = (overrides: Partial<User> = {}): User =>
    ({
      id: 'user-1',
      timezone: 'UTC+10:00', // matches your prod format
      current_activity_sequence_id: null,
      completing_sequence_log: null,
      ...overrides,
    } as User);

  const baseStartLocal = new Date('2025-09-11T07:00:00+10:00');

  describe('getOrCreateCompletingSequenceLog() test', () => {
    it('returns existing consistent log when user already has one on same local day', async () => {
      const existingLog = {
        id: 'log-1',
        activity_sequence_id: 'seq-1',
        start_time: baseStartLocal,
      } as CompletedActivitySequence;

      const user = makeUser({
        current_activity_sequence_id: 'seq-1',
        completing_sequence_log: existingLog,
      });

      const result = await service.getOrCreateCompletingSequenceLog(user, 'seq-1', baseStartLocal);
      expect(result).toBe(existingLog);
      expect(completedRepo.create).not.toHaveBeenCalled();
      expect(completedRepo.orm.findOne).not.toHaveBeenCalled();
    });

    it('returns found log in DB for same local day', async () => {
      const foundLog = {
        id: 'log-2',
        activity_sequence_id: 'seq-1',
        start_time: baseStartLocal,
      } as CompletedActivitySequence;
      completedRepo.orm.findOne.mockResolvedValueOnce(foundLog);

      const user = makeUser();
      const result = await service.getOrCreateCompletingSequenceLog(user, 'seq-1', baseStartLocal);
      expect(result).toBe(foundLog);
    });

    it('creates new log if none found', async () => {
      completedRepo.orm.findOne.mockResolvedValueOnce(null);
      const newLog = { id: 'log-3' } as CompletedActivitySequence;
      completedRepo.create.mockResolvedValueOnce(newLog);

      const user = makeUser();
      const result = await service.getOrCreateCompletingSequenceLog(user, 'seq-1', baseStartLocal);
      expect(result).toBe(newLog);
      expect(completedRepo.create).toHaveBeenCalled();
    });
  });

  describe('getOrCreateCompletingSequenceLogForSyncing', () => {
    it('returns incomplete log if one exists for local day', async () => {
      const incomplete = { id: 'log-4', is_completed: false } as CompletedActivitySequence;
      completedRepo.orm.findOne.mockResolvedValueOnce(incomplete); // first call: incomplete

      const user = makeUser();
      const result = await service.getOrCreateCompletingSequenceLogForSyncing(user, 'seq-1', baseStartLocal);
      expect(result).toBe(incomplete);
    });

    it('returns completed log if no incomplete exists', async () => {
      completedRepo.orm.findOne
        .mockResolvedValueOnce(null) // incomplete
        .mockResolvedValueOnce({ id: 'log-5', is_completed: true } as CompletedActivitySequence); // completed

      const user = makeUser();
      const result = await service.getOrCreateCompletingSequenceLogForSyncing(user, 'seq-1', baseStartLocal);
      expect(result.id).toBe('log-5');
    });

    it('creates new log if none exist for the day', async () => {
      completedRepo.orm.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
      const newLog = { id: 'log-6' } as CompletedActivitySequence;
      completedRepo.create.mockResolvedValueOnce(newLog);

      const user = makeUser();
      const result = await service.getOrCreateCompletingSequenceLogForSyncing(user, 'seq-1', baseStartLocal);
      expect(result).toBe(newLog);
      expect(completedRepo.create).toHaveBeenCalled();
    });
  });

  //
  // --- Timezone bucketing / bounds checks ---
  // Issue #1169 Bug stems from early morning being bucketed with the previous day sequence that should have ended at 11:59. Now past midnight = new activity sequence generated.
  //
  describe('timezone bucketing (user local day windows)', () => {
    const captureWhereBounds = () => {
      let lastWhere: any;
      completedRepo.orm.findOne.mockImplementation(async (arg: any) => {
        lastWhere = arg?.where;
        return null;
      });
      return () => lastWhere;
    };

    it('buckets AEST local 2025-09-11 07:00 (+10) into [2025-09-10T14:00Z, 2025-09-11T13:59:59.999Z]', async () => {
      const getWhere = captureWhereBounds();

      const user = makeUser({ timezone: 'UTC+10:00' });
      await service.getOrCreateCompletingSequenceLog(user, 'seq-1', new Date('2025-09-11T07:00:00+10:00'));

      const where = getWhere();
      const [lower, upper] = where.start_time?.value || [];
      expect(new Date(lower).toISOString()).toBe('2025-09-10T14:00:00.000Z');
      expect(new Date(upper).toISOString()).toBe('2025-09-11T13:59:59.999Z');
    });

    it('same instant as 2025-09-10 21:00Z buckets to the same AEST window', async () => {
      const getWhere = captureWhereBounds();

      const user = makeUser({ timezone: 'UTC+10:00' });
      await service.getOrCreateCompletingSequenceLog(user, 'seq-1', new Date('2025-09-10T21:00:00Z'));

      const where = getWhere();
      const [lower, upper] = where.start_time?.value || [];
      expect(new Date(lower).toISOString()).toBe('2025-09-10T14:00:00.000Z');
      expect(new Date(upper).toISOString()).toBe('2025-09-11T13:59:59.999Z');
    });

    it('UTC user buckets by [00:00Z, 23:59:59.999Z]', async () => {
      const getWhere = captureWhereBounds();

      const user = makeUser({ timezone: 'UTC' });
      await service.getOrCreateCompletingSequenceLog(user, 'seq-1', new Date('2025-09-11T07:00:00Z'));

      const where = getWhere();
      const [lower, upper] = where.start_time?.value || [];
      expect(new Date(lower).toISOString()).toBe('2025-09-11T00:00:00.000Z');
      expect(new Date(upper).toISOString()).toBe('2025-09-11T23:59:59.999Z');
    });

    it('same local day → identical bounds; across midnight → different', async () => {
      const bounds: string[] = [];
      completedRepo.orm.findOne.mockImplementation(async (arg: any) => {
        const [l, u] = arg.where.start_time.value;
        bounds.push(`${new Date(l).toISOString()}|${new Date(u).toISOString()}`);
        return null;
      });

      const user = makeUser({ timezone: 'UTC+10:00' });

      // same local day
      await service.getOrCreateCompletingSequenceLog(user, 'seq-1', new Date('2025-09-11T07:00:00+10:00'));
      await service.getOrCreateCompletingSequenceLog(user, 'seq-1', new Date('2025-09-11T12:00:00+10:00'));
      expect(bounds[0]).toBe(bounds[1]);
      expect(bounds[1]).toBe('2025-09-10T14:00:00.000Z|2025-09-11T13:59:59.999Z');

      // across midnight (should generate a new day, not the same day)
      await service.getOrCreateCompletingSequenceLog(user, 'seq-1', new Date('2025-09-11T23:30:00+10:00')); // still 11th local day
      await service.getOrCreateCompletingSequenceLog(user, 'seq-1', new Date('2025-09-12T00:10:00+10:00')); // now 12th local day
      expect(bounds[bounds.length - 2]).toBe('2025-09-10T14:00:00.000Z|2025-09-11T13:59:59.999Z'); // 11th local
      expect(bounds[bounds.length - 1]).toBe('2025-09-11T14:00:00.000Z|2025-09-12T13:59:59.999Z'); // 12th local
      expect(bounds[bounds.length - 2]).not.toBe(bounds[bounds.length - 1]);
    });
  });
});
