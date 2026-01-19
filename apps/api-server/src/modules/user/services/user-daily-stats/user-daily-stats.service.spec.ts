import { Test, TestingModule } from '@nestjs/testing';
import { SENTRY_TOKEN } from '@app/observability';
import { getQueueToken } from '@nestjs/bull';
import { UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DateTime, Settings } from 'luxon';
import { Between } from 'typeorm';
import { BullQueues, BullWorkers, DAYS_IN_WEEK, TEN_MINUTES } from '../../../../shared/utils/constants';
import { BASE_ONBOARDING_PROGRESS } from '../../../../../../../cron-jobs/user-stats-cron-job/constants';
import { UserDailyStatsService } from './user-daily-stats.service';
import {
  ActivitySequenceServiceMock,
  CompletedActivityRepositoryMock,
  CompletedActivitySequenceRepositoryMock,
  DailyStatsRepositoryMock,
  DeviceServiceMock,
  SentryServiceMock,
  UserRepositoryMock,
  UserServiceMock,
} from '../../../../../test/mocks';
import { UserRepository } from '../../repositories/user.repository';
import { CompletedActivityRepository } from '../../../activity/repositories/completed-activity.repository';
import { CompletedActivitySequenceRepository } from '../../../activity/repositories/completed-activity-sequence.repository';
import {
  userDummy,
  adminUserDummy,
  QueueMock,
  UncompletedSequenceLogDummy,
  dailyStatsArrayDummy,
  routineDurationsDummy,
  dailyStatsArrayDummyWithSkippedDay,
  DailyStatsDummy,
  DailyDurationsDummy,
  CompletedActivityDummy,
} from '../../../../../test/dummies';
import { ActivityType } from '../../../activity/domain/activity-type.enum';
import { DailyStatsRepository } from '../../repositories/user-daily-stats.repository';
import { UserProgressUpdateTypes } from '../../domain/user-progress-update-types.enum';
import { DeviceService } from '../../../device/services/device/device.service';
import { ActivitySequenceService } from '../../../activity/services/activity-sequence/activity-sequence.service';
import { UserService } from '../user/user.service';
import { DailyStatSummary } from '../../domain/daily-stat-summary.model';

describe('UserDailyStatsService', () => {
  let service: UserDailyStatsService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserDailyStatsService,
        DailyStatsRepository,
        UserRepository,
        CompletedActivityRepository,
        CompletedActivitySequenceRepository,
        DeviceService,
        ActivitySequenceService,
        UserService,
        {
          provide: SENTRY_TOKEN,
          useValue: SentryServiceMock,
        },
        {
          provide: getQueueToken(BullQueues.STATS),
          useValue: QueueMock,
        },
      ],
    })
      .overrideProvider(UserRepository)
      .useValue(UserRepositoryMock)
      .overrideProvider(CompletedActivityRepository)
      .useValue(CompletedActivityRepositoryMock)
      .overrideProvider(CompletedActivitySequenceRepository)
      .useValue(CompletedActivitySequenceRepositoryMock)
      .overrideProvider(DailyStatsRepository)
      .useValue(DailyStatsRepositoryMock)
      .overrideProvider(DeviceService)
      .useValue(DeviceServiceMock)
      .overrideProvider(ActivitySequenceService)
      .useValue(ActivitySequenceServiceMock)
      .overrideProvider(UserService)
      .useValue(UserServiceMock)
      .compile();

    service = module.get<UserDailyStatsService>(UserDailyStatsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('updateUserOnboardingProgress', () => {
    it("positive: if called with EDIT_SETTINGS event type, user's onboarding progress has_edited_settings property should change to true", async () => {
      const mockOnboardingProgress = {
        level: 1,
        has_edited_focus_mode: false,
        has_edited_settings: false,
        has_edited_always_blocked_urls: false,
        has_installed_desktop_app: false,
        has_installed_mobile_app: false,
      };
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce({
        ...userDummy,
        onboarding_progress: mockOnboardingProgress,
      });

      await service.updateUserOnboardingProgress(userDummy.id, UserProgressUpdateTypes.EDIT_FOCUS_MODE);

      expect(UserRepositoryMock.orm.update).toHaveBeenCalledWith(userDummy.id, {
        onboarding_progress: { ...mockOnboardingProgress, has_edited_focus_mode: true },
      });
    });

    it("positive: if called with EDIT_BLOCKED_URLS event type, user's onboarding progress has_edited_always_blocked_urls property should change to true", async () => {
      const mockOnboardingProgress = {
        level: 1,
        has_edited_focus_mode: false,
        has_edited_settings: false,
        has_edited_always_blocked_urls: false,
        has_installed_desktop_app: true,
        has_installed_mobile_app: true,
      };
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce({
        ...userDummy,
        onboarding_progress: mockOnboardingProgress,
      });

      await service.updateUserOnboardingProgress(userDummy.id, UserProgressUpdateTypes.EDIT_BLOCKED_URLS);

      expect(UserRepositoryMock.orm.update).toHaveBeenCalledWith(userDummy.id, {
        onboarding_progress: { ...mockOnboardingProgress, has_edited_always_blocked_urls: true },
      });
    });

    it("positive: if called with EDIT_FOCUS_MODE event type, user's onboarding progress has_edited_always_blocked_urls property should change to true", async () => {
      const mockOnboardingProgress = {
        level: 1,
        has_edited_focus_mode: false,
        has_edited_settings: false,
        has_edited_always_blocked_urls: false,
        has_installed_desktop_app: true,
        has_installed_mobile_app: true,
      };
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce({
        ...userDummy,
        onboarding_progress: mockOnboardingProgress,
      });

      await service.updateUserOnboardingProgress(userDummy.id, UserProgressUpdateTypes.EDIT_BLOCKED_URLS);

      expect(UserRepositoryMock.orm.update).toHaveBeenCalledWith(userDummy.id, {
        onboarding_progress: { ...mockOnboardingProgress, has_edited_always_blocked_urls: true },
      });
    });

    it("positive: if called with CHAT_WITH_FOCUS_BEAR event type, user's onboarding progress has_chatted_with_focus_bear property should change to true", async () => {
      const mockOnboardingProgress = {
        level: 1,
        has_edited_focus_mode: false,
        has_edited_settings: false,
        has_edited_always_blocked_urls: false,
        has_installed_desktop_app: true,
        has_installed_mobile_app: true,
        has_chatted_with_focus_bear: false,
      };
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce({
        ...userDummy,
        onboarding_progress: mockOnboardingProgress,
      });

      await service.updateUserOnboardingProgress(userDummy.id, UserProgressUpdateTypes.CHAT_WITH_FOCUS_BEAR);

      expect(UserRepositoryMock.orm.update).toHaveBeenCalledWith(userDummy.id, {
        onboarding_progress: { ...mockOnboardingProgress, has_chatted_with_focus_bear: true },
      });
    });

    it("positive: if user doesn't have onboarding stats, base onboarding stats should be used", async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce({
        ...userDummy,
        onboarding_progress: null,
      });

      await service.updateUserOnboardingProgress(userDummy.id, UserProgressUpdateTypes.EDIT_SETTINGS);

      expect(UserRepositoryMock.orm.update).toHaveBeenCalledWith(userDummy.id, {
        onboarding_progress: { ...BASE_ONBOARDING_PROGRESS, has_edited_settings: true },
      });
    });
  });

  describe('calculateRoutineCompletionPercentage', () => {
    beforeEach(() => {
      jest.resetAllMocks();
    });

    it('positive: If the user has not completed any activities for the routine, completion percentage of 0 should be returned', async () => {
      const mockOnboardingProgress = {
        level: 1,
        has_edited_focus_mode: false,
        has_edited_settings: false,
        has_edited_always_blocked_urls: false,
      };
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce({
        ...userDummy,
        onboarding_progress: mockOnboardingProgress,
      });
      CompletedActivitySequenceRepositoryMock.orm.findOne.mockResolvedValueOnce(null);
      ActivitySequenceServiceMock.getUserRoutineDailyDurations.mockResolvedValueOnce({
        morningRoutineDailyDurations: routineDurationsDummy,
        eveningRoutineDailyDurations: routineDurationsDummy,
        microBreaksDailyDurations: routineDurationsDummy,
      });

      const sequenceId = randomUUID();

      const percentage = await service.calculateRoutineCompletionPercentage(userDummy.id, sequenceId);

      expect(percentage).toBe(0);
    });

    it('positive: already completed activities total duration should be returned as percentage of entire sequence duration', async () => {
      const mockOnboardingProgress = {
        level: 1,
        has_edited_focus_mode: false,
        has_edited_settings: false,
        has_edited_always_blocked_urls: false,
      };
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce({
        ...userDummy,
        onboarding_progress: mockOnboardingProgress,
      });
      CompletedActivitySequenceRepositoryMock.orm.findOne.mockResolvedValueOnce(UncompletedSequenceLogDummy);
      CompletedActivityRepositoryMock.orm.find.mockResolvedValueOnce([
        { ...CompletedActivityDummy, duration_logged: 60 },
        { ...CompletedActivityDummy, duration_logged: 60 },
        { ...CompletedActivityDummy, duration_logged: 60 },
      ]);
      ActivitySequenceServiceMock.getUserRoutineDailyDurations.mockResolvedValueOnce({
        morningRoutineDailyDurations: routineDurationsDummy,
        eveningRoutineDailyDurations: routineDurationsDummy,
        microBreaksDailyDurations: routineDurationsDummy,
      });
      const sequenceId = randomUUID();

      const percentage = await service.calculateRoutineCompletionPercentage(userDummy.id, sequenceId);

      expect(percentage).toBe(60);
    });

    it('positive: if current day duration is 360 seconds and completed activities duration is 180, completion % should be 50%', async () => {
      const mockOnboardingProgress = {
        level: 1,
        has_edited_focus_mode: false,
        has_edited_settings: false,
        has_edited_always_blocked_urls: false,
      };
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce({
        ...userDummy,
        onboarding_progress: mockOnboardingProgress,
      });
      CompletedActivitySequenceRepositoryMock.orm.findOne.mockResolvedValueOnce({
        ...UncompletedSequenceLogDummy,
        // Set date to be Monday (has morning sequence duration duration of 360 seconds)
        start_time: new Date('2023-08-21T06:00:00.000Z'),
      });
      CompletedActivityRepositoryMock.orm.find.mockResolvedValueOnce([
        { ...CompletedActivityDummy, duration_logged: 60 },
        { ...CompletedActivityDummy, duration_logged: 60 },
        { ...CompletedActivityDummy, duration_logged: 60 },
      ]);
      ActivitySequenceServiceMock.getUserRoutineDailyDurations.mockResolvedValueOnce({
        morningRoutineDailyDurations: { ...routineDurationsDummy, MON: 360 },
        eveningRoutineDailyDurations: routineDurationsDummy,
        microBreaksDailyDurations: routineDurationsDummy,
      });
      const sequenceId = randomUUID();

      const percentage = await service.calculateRoutineCompletionPercentage(userDummy.id, sequenceId);

      expect(percentage).toBe(50);
    });
  });

  describe('CalculateUserStatsResponse', () => {
    beforeEach(() => {
      jest.resetAllMocks();
    });

    Settings.now = () => 1676254469000;

    it('positive: user streaks of routines in continuous days should be returned', async () => {
      const mockOnboardingProgress = {
        level: 1,
        has_edited_focus_mode: false,
        has_edited_settings: false,
        has_edited_always_blocked_urls: false,
      };
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce({
        ...userDummy,
        onboarding_progress: mockOnboardingProgress,
      });
      DailyStatsRepositoryMock.getUserDailyStats.mockResolvedValueOnce(dailyStatsArrayDummy);
      DeviceServiceMock.getUserInstalledDevices.mockResolvedValueOnce({
        hasInstalledDesktopApp: false,
        hasInstalledMobileApp: false,
      });
      ActivitySequenceServiceMock.getUserRoutineDailyDurations.mockResolvedValueOnce({
        morningRoutineDailyDurations: routineDurationsDummy,
        eveningRoutineDailyDurations: routineDurationsDummy,
        microBreaksDailyDurations: routineDurationsDummy,
      });

      const userStats = await service.CalculateUserStatsResponse(userDummy.id);

      expect(userStats.morning_routine_completion_streak_days).toBe(3);
      expect(userStats.evening_routine_completion_streak_days).toBe(3);
    });

    it('positive: user streak of focus modes in continuous days should be returned without being reset if focus modes not done on weekends', async () => {
      // in mock there is a weekend stat where no focus mode has been completed for that day, this should not reset the streak
      const mockOnboardingProgress = {
        level: 1,
        has_edited_focus_mode: false,
        has_edited_settings: false,
        has_edited_always_blocked_urls: false,
      };
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce({
        ...userDummy,
        onboarding_progress: mockOnboardingProgress,
      });
      DailyStatsRepositoryMock.getUserDailyStats.mockResolvedValueOnce(dailyStatsArrayDummy);
      DeviceServiceMock.getUserInstalledDevices.mockResolvedValueOnce({
        hasInstalledDesktopApp: false,
        hasInstalledMobileApp: false,
      });
      ActivitySequenceServiceMock.getUserRoutineDailyDurations.mockResolvedValueOnce({
        morningRoutineDailyDurations: routineDurationsDummy,
        eveningRoutineDailyDurations: routineDurationsDummy,
        microBreaksDailyDurations: routineDurationsDummy,
      });

      const userStats = await service.CalculateUserStatsResponse(userDummy.id);

      expect(userStats.focus_mode_completion_streak_days).toBe(7);
    });

    it('positive: if user has mobile device installed, has_installed_mobile_app value should be true', async () => {
      const mockOnboardingProgress = {
        level: 1,
        has_edited_focus_mode: false,
        has_edited_settings: false,
        has_edited_always_blocked_urls: false,
      };
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce({
        ...userDummy,
        onboarding_progress: mockOnboardingProgress,
      });
      DailyStatsRepositoryMock.getUserDailyStats.mockResolvedValueOnce(dailyStatsArrayDummy);
      DeviceServiceMock.getUserInstalledDevices.mockResolvedValueOnce({
        hasInstalledDesktopApp: false,
        hasInstalledMobileApp: true,
      });
      ActivitySequenceServiceMock.getUserRoutineDailyDurations.mockResolvedValueOnce({
        morningRoutineDailyDurations: routineDurationsDummy,
        eveningRoutineDailyDurations: routineDurationsDummy,
        microBreaksDailyDurations: routineDurationsDummy,
      });

      const userStats = await service.CalculateUserStatsResponse(userDummy.id);

      expect(userStats.has_installed_mobile_app).toBe(true);
    });

    it('positive: if focus mode streak is more than 10 while user on level 0 or 1, focus_modes_completion_percentage_for_current_level should be  100%', async () => {
      const mockOnboardingProgress = {
        level: 1,
        has_edited_focus_mode: true,
        has_edited_settings: true,
        has_edited_always_blocked_urls: true,
      };
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce({
        ...userDummy,
        onboarding_progress: mockOnboardingProgress,
      });
      DailyStatsRepositoryMock.getUserDailyStats.mockResolvedValueOnce(dailyStatsArrayDummy);
      DeviceServiceMock.getUserInstalledDevices.mockResolvedValueOnce({
        hasInstalledDesktopApp: true,
        hasInstalledMobileApp: true,
      });
      ActivitySequenceServiceMock.getUserRoutineDailyDurations.mockResolvedValueOnce({
        morningRoutineDailyDurations: routineDurationsDummy,
        eveningRoutineDailyDurations: routineDurationsDummy,
        microBreaksDailyDurations: routineDurationsDummy,
      });

      const userStats = await service.CalculateUserStatsResponse(userDummy.id);

      expect(userStats.focus_modes_completion_percentage_for_current_level).toBe(100);
    });

    it('positive: user streaks should be updated in DB after calculation', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce({
        ...userDummy,
        onboarding_progress: null,
      });
      DailyStatsRepositoryMock.getUserDailyStats.mockResolvedValueOnce(dailyStatsArrayDummy);
      DeviceServiceMock.getUserInstalledDevices.mockResolvedValueOnce({
        hasInstalledDesktopApp: false,
        hasInstalledMobileApp: false,
      });
      ActivitySequenceServiceMock.getUserRoutineDailyDurations.mockResolvedValueOnce({
        morningRoutineDailyDurations: routineDurationsDummy,
        eveningRoutineDailyDurations: routineDurationsDummy,
        microBreaksDailyDurations: routineDurationsDummy,
      });

      await service.CalculateUserStatsResponse(userDummy.id);

      expect(UserRepositoryMock.update).toHaveBeenCalledWith(userDummy.id, {
        morning_routines_streak: 3,
        evening_routines_streak: 3,
        micro_breaks_streak: 0,
        focus_modes_streak: 7,
        onboarding_progress: {
          has_installed_desktop_app: false,
          has_installed_mobile_app: false,
          level: 1,
        },
      });
    });

    it("positive: user streak should not be reset if they didn't do a routine because they don't have activities for that day", async () => {
      // in this test the user has no activities in their morning routine for Sundays and there are stats for Sat and Mon
      // current date is Mocked to be the Mon, so streak should be 2 for Sat and Mon
      Settings.now = () => new Date('2023-02-12T20:30:00+0000').valueOf();
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce({
        ...userDummy,
        onboarding_progress: null,
      });
      DailyStatsRepositoryMock.getUserDailyStats.mockResolvedValueOnce(dailyStatsArrayDummyWithSkippedDay);
      DeviceServiceMock.getUserInstalledDevices.mockResolvedValueOnce({
        hasInstalledDesktopApp: false,
        hasInstalledMobileApp: false,
      });
      ActivitySequenceServiceMock.getUserRoutineDailyDurations.mockResolvedValueOnce({
        morningRoutineDailyDurations: { MON: 300, TUE: 300, WED: 300, THU: 300, FRI: 300, SAT: 300, SUN: 0 },
        eveningRoutineDailyDurations: routineDurationsDummy,
        microBreaksDailyDurations: routineDurationsDummy,
      });

      const response = await service.CalculateUserStatsResponse(userDummy.id);

      expect(response.morning_routine_completion_streak_days).toBe(2);
    });
  });

  describe('updateDailyStatsFocusModesCompleted', () => {
    it('positive: if no existing daily stat record is found one should be created showing that a focus mode has been completed', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      DailyStatsRepositoryMock.orm.findOne.mockResolvedValueOnce(null);
      UserServiceMock.isVerboseLoggingAllowed.mockResolvedValueOnce({ isVerboseLoggingAllowed: false });
      const finishTime = new Date();
      const startOfDate = DateTime.fromJSDate(finishTime).setZone('UTC').startOf('day').toJSDate();

      await service.updateDailyStatsFocusModesCompleted(userDummy.id, finishTime, 'UTC', 100);

      expect(DailyStatsRepositoryMock.create).toHaveBeenCalledWith({
        user_id: userDummy.id,
        date_completed: startOfDate,
        focus_modes_completed: 1,
        seconds_spent_in_focus_sessions: 100,
      });
    });

    it('positive: if existing daily stat record is found it should be updated with the focus mode count incremented', async () => {
      const dailyStatDummy = dailyStatsArrayDummy[0];
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      DailyStatsRepositoryMock.orm.findOne.mockResolvedValueOnce(dailyStatDummy);
      UserServiceMock.isVerboseLoggingAllowed.mockResolvedValueOnce({ isVerboseLoggingAllowed: false });
      const finishTime = new Date();

      await service.updateDailyStatsFocusModesCompleted(userDummy.id, finishTime, 'UTC', 1200);

      expect(DailyStatsRepositoryMock.orm.save).toHaveBeenCalledWith({
        ...dailyStatDummy,
        focus_modes_completed: dailyStatDummy.focus_modes_completed + 1,
        seconds_spent_in_focus_sessions: 1200,
      });
    });

    it('positive: should search for a daily stat record between start and end of date focus mode was completed', async () => {
      const dailyStatDummy = dailyStatsArrayDummy[0];
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      DailyStatsRepositoryMock.orm.findOne.mockResolvedValueOnce(dailyStatDummy);
      UserServiceMock.isVerboseLoggingAllowed.mockResolvedValueOnce({ isVerboseLoggingAllowed: false });
      const timezone = 'UTC';
      const finishTime = new Date('2023-08-20T15:30:00Z');
      const dayStart = new Date('2023-08-20T00:00:00.000Z');
      const dayEnd = new Date('2023-08-20T23:59:59.999Z');

      await service.updateDailyStatsFocusModesCompleted(userDummy.id, finishTime, timezone, 1200);

      expect(DailyStatsRepositoryMock.orm.findOne).toHaveBeenCalledWith({
        where: { user_id: userDummy.id, date_completed: Between(dayStart, dayEnd) },
      });
    });
  });

  describe('updateDailyStatsRoutineCompletion', () => {
    it('positive: should add activity details to queue where the routine completion % will be calculated', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      const sequenceId = randomUUID();
      const startTime = new Date();

      await service.updateDailyStatsRoutineCompletion(
        userDummy.id,
        ActivityType.morning,
        sequenceId,
        startTime,
        'UTC',
        false,
      );

      expect(QueueMock.add).toHaveBeenCalledWith(
        BullWorkers.DAILY_STATS_ACTIVITY_COMPLETED,
        {
          user_id: userDummy.id,
          activityType: ActivityType.morning,
          completed_activity_log_id: sequenceId,
          startTime,
          timeZone: 'UTC',
          isOffLineActivity: false,
        },
        { delay: TEN_MINUTES },
      );
    });
  });

  describe('generateLast7Days', () => {
    it('should return last 7 dates', () => {
      const dates = service.generateLastNDaysDates(DAYS_IN_WEEK);
      const endOfLast7DaysDate = new Date();
      endOfLast7DaysDate.setDate(endOfLast7DaysDate.getDate() - 1);
      expect(dates.length).toBe(7);
      expect(dates[6].toISOString().slice(0, 10)).toBe(endOfLast7DaysDate.toISOString().slice(0, 10));
    });
  });

  describe('findDayStat', () => {
    it('should find stat by date', () => {
      const mockStat = {
        date_completed: new Date('2023-01-01T12:00:00Z'),
        morning_routine_completion_percentage: 50,
        evening_routine_completion_percentage: 50,
        focus_modes_completed: 2,
      };
      const date = new Date('2023-01-01T12:00:00Z');
      const foundStat = service.findDayStat([mockStat], date);
      expect(foundStat).toBe(mockStat);
    });
  });

  describe('getLastWeekDailyStats', () => {
    it('should fetch last week stats', async () => {
      DailyStatsRepositoryMock.orm.find.mockResolvedValueOnce(DailyStatsDummy);
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce({ ...userDummy, timezome: 'UTC' });
      ActivitySequenceServiceMock.getUserRoutineDailyDurations.mockResolvedValueOnce({
        morningRoutineDailyDurations: DailyDurationsDummy,
        eveningRoutineDailyDurations: DailyDurationsDummy,
        microBreaksDailyDurations: routineDurationsDummy,
      });
      const stats = await service.getLastNDaysDailyStats(userDummy.id, DAYS_IN_WEEK);
      expect(stats.length).toBe(7);
      expect(stats[0]).toBeInstanceOf(DailyStatSummary);
    });
  });

  describe('getUserStatsForAdminDashboard', () => {
    beforeEach(() => {
      jest.resetAllMocks();
    });

    it('positive: should return aggregated user stats when called by an admin', async () => {
      const mockDailyStats = [
        {
          focus_modes_completed: 3,
          seconds_spent_in_focus_sessions: 3600,
          morning_routine_completion_percentage: 80,
          evening_routine_completion_percentage: 60,
          micro_breaks_routine_completion_percentage: 70,
        },
        {
          focus_modes_completed: 2,
          seconds_spent_in_focus_sessions: 1800,
          morning_routine_completion_percentage: 90,
          evening_routine_completion_percentage: 40,
          micro_breaks_routine_completion_percentage: 30,
        },
      ];

      UserRepositoryMock.orm.findOneBy
        .mockResolvedValueOnce(adminUserDummy)
        .mockResolvedValueOnce({ ...userDummy, focus_modes_streak: 5 });
      DailyStatsRepositoryMock.getUserDailyStats.mockResolvedValueOnce(mockDailyStats);

      const result = await service.getUserStatsForAdminDashboard(adminUserDummy.id, userDummy.id);

      expect(result.total_focus_sessions).toBe(5);
      expect(result.total_focus_duration_minutes).toBe(90);
      expect(result.streak_days).toBe(5);
      expect(result.total_routines_completed).toBe(3);
      expect(result.total_habits_completed).toBe(1);
    });

    it('negative: should throw UnauthorizedException when called by a non-admin user', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);

      await expect(service.getUserStatsForAdminDashboard(userDummy.id, userDummy.id)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('positive: should return zero values when user has no daily stats', async () => {
      UserRepositoryMock.orm.findOneBy
        .mockResolvedValueOnce(adminUserDummy)
        .mockResolvedValueOnce({ ...userDummy, focus_modes_streak: 0 });
      DailyStatsRepositoryMock.getUserDailyStats.mockResolvedValueOnce([]);

      const result = await service.getUserStatsForAdminDashboard(adminUserDummy.id, userDummy.id);

      expect(result.total_focus_sessions).toBe(0);
      expect(result.total_focus_duration_minutes).toBe(0);
      expect(result.average_daily_focus_minutes).toBe(0);
      expect(result.streak_days).toBe(0);
    });
  });
});
