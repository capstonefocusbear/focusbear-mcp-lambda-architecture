import { Test } from '@nestjs/testing';
import { BadRequestException, NotAcceptableException, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Settings } from 'luxon';
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

  beforeEach(async () => {
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

    jest.resetAllMocks();
    jest.clearAllMocks();
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
      Settings.now = () => new Date('2022-10-06T12:00:00.000Z').valueOf();
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
      Settings.now = () => new Date().valueOf();
    });

    it("negative: should throw error if cancel_habits_for_today is false, current sequence started on current date, and it's not time for next sequence yet", async () => {
      Settings.now = () => new Date('2022-10-06T12:00:00.000Z').valueOf();
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
      Settings.now = () => new Date().valueOf();
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
      Settings.now = () => new Date('2022-10-06T18:05:00.000Z').valueOf();
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
        last_completed_sequence_at: expect.toBeDate(),
        last_completed_sequence_started_at: expect.toBeDate(),
        current_sequence_started_at: null,
        current_completing_sequence_log_id: null,
        has_received_inactivity_warning: false,
        updated_at: expect.toBeDateString(),
      });
      Settings.now = () => new Date().valueOf();
    });

    it('positive: should nullify current sequence for user if existing sequence is evening and morning sequence has started with "cancel_habits_for_today" as false(evening sequence is after 12PM)', async () => {
      Settings.now = () => new Date('2022-10-06T08:05:00.000Z').valueOf();
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
        last_completed_sequence_at: expect.toBeDate(),
        last_completed_sequence_started_at: expect.toBeDate(),
        current_sequence_started_at: null,
        current_completing_sequence_log_id: null,
        has_received_inactivity_warning: false,
        updated_at: expect.toBeDateString(),
      });
      Settings.now = () => new Date().valueOf();
    });

    it('positive: should nullify current sequence for user if existing sequence is morning and evening sequence has started with "cancel_habits_for_today" as false (timezone: America/New_York || UTC-05:00)', async () => {
      Settings.now = () => new Date('2022-10-06T23:05:00.000Z').valueOf();
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
        last_completed_sequence_at: expect.toBeDate(),
        last_completed_sequence_started_at: expect.toBeDate(),
        current_sequence_started_at: null,
        current_completing_sequence_log_id: null,
        has_received_inactivity_warning: false,
        updated_at: expect.toBeDateString(),
      });
      Settings.now = () => new Date().valueOf();
    });

    it('positive: should nullify current sequence for user if existing sequence is morning and evening sequence has started with "cancel_habits_for_today" as false (timezone: Australia/Melbourne || UTC+11:00)', async () => {
      Settings.now = () => new Date('2022-10-06T07:05:00.000Z').valueOf();
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
        last_completed_sequence_at: expect.toBeDate(),
        last_completed_sequence_started_at: expect.toBeDate(),
        current_sequence_started_at: null,
        current_completing_sequence_log_id: null,
        has_received_inactivity_warning: false,
        updated_at: expect.toBeDateString(),
      });
      Settings.now = () => new Date().valueOf();
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
});
