import { Test, TestingModule } from '@nestjs/testing';
import { SENTRY_TOKEN } from '@ntegral/nestjs-sentry';
import { getQueueToken } from '@nestjs/bull';
import { randomUUID } from 'crypto';
import { DateTime, Settings } from 'luxon';
import { TEN_MINUTES } from '../../../../shared/utils/constants';
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

  beforeEach(async () => {
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
          provide: getQueueToken('stats'),
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

    jest.clearAllMocks();
    jest.resetAllMocks();
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

      expect(UserRepositoryMock.orm.update).toBeCalledWith(userDummy.id, {
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

      expect(UserRepositoryMock.orm.update).toBeCalledWith(userDummy.id, {
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

      expect(UserRepositoryMock.orm.update).toBeCalledWith(userDummy.id, {
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

      expect(UserRepositoryMock.orm.update).toBeCalledWith(userDummy.id, {
        onboarding_progress: { ...mockOnboardingProgress, has_chatted_with_focus_bear: true },
      });
    });

    it("positive: if user doesn't have onboarding stats, base onboarding stats should be used", async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce({
        ...userDummy,
        onboarding_progress: null,
      });

      await service.updateUserOnboardingProgress(userDummy.id, UserProgressUpdateTypes.EDIT_SETTINGS);

      expect(UserRepositoryMock.orm.update).toBeCalledWith(userDummy.id, {
        onboarding_progress: { ...BASE_ONBOARDING_PROGRESS, has_edited_settings: true },
      });
    });
  });

  describe('calculateRoutineCompletionPercentage', () => {
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
      });
      const sequenceId = randomUUID();

      const percentage = await service.calculateRoutineCompletionPercentage(userDummy.id, sequenceId);

      expect(percentage).toBe(50);
    });
  });

  describe('CalculateUserStatsResponse', () => {
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
      });

      const userStats = await service.CalculateUserStatsResponse(userDummy.id);

      expect(userStats.focus_mode_completion_streak_days).toBe(10);
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
      });

      await service.CalculateUserStatsResponse(userDummy.id);

      expect(UserRepositoryMock.update).toBeCalledWith(userDummy.id, {
        morning_routines_streak: 3,
        evening_routines_streak: 3,
        focus_modes_streak: 10,
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
        morningRoutineDailyDurations: { MON: 300, TUE: 300, WED: 300, THU: 300, FRI: 300, SAT: 0, SUN: 300 },
        eveningRoutineDailyDurations: routineDurationsDummy,
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

      await service.updateDailyStatsFocusModesCompleted(userDummy.id, finishTime, 'UTC');

      expect(DailyStatsRepositoryMock.create).toBeCalledWith({
        user_id: userDummy.id,
        date_completed: startOfDate,
        focus_modes_completed: 1,
      });
    });

    it('positive: if existing daily stat record is found it should be updated with the focus mode count incremented', async () => {
      const dailyStatDummy = dailyStatsArrayDummy[0];
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      DailyStatsRepositoryMock.orm.findOne.mockResolvedValueOnce(dailyStatDummy);
      UserServiceMock.isVerboseLoggingAllowed.mockResolvedValueOnce({ isVerboseLoggingAllowed: false });
      const finishTime = new Date();

      await service.updateDailyStatsFocusModesCompleted(userDummy.id, finishTime, 'UTC');

      expect(DailyStatsRepositoryMock.orm.save).toBeCalledWith({
        ...dailyStatDummy,
        focus_modes_completed: dailyStatDummy.focus_modes_completed + 1,
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

      expect(QueueMock.add).toBeCalledWith(
        'daily-stats-activity-completed',
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
    it('should return last 7 dates including today', () => {
      const dates = service.generateLast7Days();
      expect(dates.length).toBe(7);
      expect(dates[6].toISOString().slice(0, 10)).toBe(new Date().toISOString().slice(0, 10));
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
      });
      const stats = await service.getLastWeekDailyStats(userDummy.id);
      expect(stats.length).toBe(7);
      expect(stats[0]).toBeInstanceOf(DailyStatSummary);
    });
  });
});
