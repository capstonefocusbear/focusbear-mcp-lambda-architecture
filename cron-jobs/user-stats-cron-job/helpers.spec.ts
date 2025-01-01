import { DummyTasksStreaksResponse } from '../../apps/api-server/test/dummies';
import { TasksStreaksResponse } from '../../apps/api-server/src/modules/user/domain/tasks-streaks-response.model';
import { UserOnboardingProgress } from '../../apps/api-server/src/modules/user/domain/user-onboarding-progress.model';
import { LEVEL_THRESHOLDS } from './constants';
import { calculateStreaks, determineUserLevel } from './helpers';
import { DailySequenceDurations } from '../../apps/api-server/src/modules/activity/domain/daily-sequence-durations.model';

describe('helpers', () => {
  const currentDate = new Date();
  const morningRoutineDailyDurations = new DailySequenceDurations();
  const eveningRoutineDailyDurations = new DailySequenceDurations();
  const microBreaksDailyDurations = new DailySequenceDurations();
  const timeZone = 'UTC';

  describe('determineUserLevel', () => {
    it('should return 0 if setup is not completed', () => {
      const onboardingProgress = new UserOnboardingProgress();
      onboardingProgress.has_installed_desktop_app = false;
      onboardingProgress.has_installed_mobile_app = false;
      const tasksStreaksResponse = new TasksStreaksResponse(DummyTasksStreaksResponse.SET_UP_NOT_COMPLETED);

      const level = determineUserLevel(onboardingProgress, tasksStreaksResponse);
      expect(level).toBe(0);
    });

    it('should correctly determine the user level based on streaks', () => {
      const onboardingProgress = new UserOnboardingProgress();
      onboardingProgress.has_edited_focus_mode = true;
      onboardingProgress.has_edited_settings = true;
      onboardingProgress.has_edited_always_blocked_urls = true;
      onboardingProgress.has_installed_desktop_app = true;
      const tasksStreaksResponse = new TasksStreaksResponse(DummyTasksStreaksResponse.ROUTINE_INPROGRESS);

      const level = determineUserLevel(onboardingProgress, tasksStreaksResponse);
      expect(level).toBe(2); // Expect the level to be 2 as it meets the second threshold
    });

    it('should assign level 1 with minimum streaks and complete setup', () => {
      const onboardingProgress = new UserOnboardingProgress();
      // Complete setup
      onboardingProgress.has_edited_focus_mode = true;
      onboardingProgress.has_edited_settings = true;
      onboardingProgress.has_edited_always_blocked_urls = true;
      onboardingProgress.has_installed_desktop_app = true;
      const tasksStreaksResponse = new TasksStreaksResponse(DummyTasksStreaksResponse.LEVEL_ONE);

      const level = determineUserLevel(onboardingProgress, tasksStreaksResponse);
      expect(level).toBe(1);
    });

    it('should not level up if streaks are just below the threshold for the next level', () => {
      const onboardingProgress = new UserOnboardingProgress();
      onboardingProgress.has_edited_focus_mode = true;
      onboardingProgress.has_edited_settings = true;
      onboardingProgress.has_edited_always_blocked_urls = true;
      onboardingProgress.has_installed_desktop_app = true;
      // Level 2 requires routines: 2, focus_modes: 2
      const tasksStreaksResponse = new TasksStreaksResponse(DummyTasksStreaksResponse.LEVEL_TWO);

      const level = determineUserLevel(onboardingProgress, tasksStreaksResponse);
      expect(level).toBe(1); // Should remain at level 1
    });

    it('should return level 0 if setup is incomplete, regardless of high streaks', () => {
      const onboardingProgress = new UserOnboardingProgress();
      // Incomplete setup
      onboardingProgress.has_edited_focus_mode = false;
      const tasksStreaksResponse = new TasksStreaksResponse(DummyTasksStreaksResponse.LEVEL_MAX);

      const level = determineUserLevel(onboardingProgress, tasksStreaksResponse);
      expect(level).toBe(0); // Should return level 0 due to incomplete setup
    });

    it('should cap the user level at the maximum defined level, even with excessive streaks', () => {
      const onboardingProgress = new UserOnboardingProgress();
      onboardingProgress.has_edited_focus_mode = true;
      onboardingProgress.has_edited_settings = true;
      onboardingProgress.has_edited_always_blocked_urls = true;
      onboardingProgress.has_installed_desktop_app = true;
      const tasksStreaksResponse = new TasksStreaksResponse(DummyTasksStreaksResponse.LEVEL_EXCEED_MAX);

      const maxLevel = LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1].level;
      const level = determineUserLevel(onboardingProgress, tasksStreaksResponse);
      expect(level).toBe(maxLevel); // Should be capped at the maximum level
    });

    it('Should return level 7 if setup complete and streaks reach seventh level threshold, but less than eight level threshold', () => {
      const onboardingProgress = new UserOnboardingProgress();
      onboardingProgress.has_edited_focus_mode = true;
      onboardingProgress.has_edited_settings = true;
      onboardingProgress.has_edited_always_blocked_urls = true;
      onboardingProgress.has_installed_desktop_app = true;
      const tasksStreaksResponse = new TasksStreaksResponse(DummyTasksStreaksResponse.LEVEL_SEVEN);

      const level = determineUserLevel(onboardingProgress, tasksStreaksResponse);
      expect(level).toBe(7);
    });
  });

  describe('calculateStreaks', () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const before_yesterday = new Date(today);
    before_yesterday.setDate(today.getDate() - 2);
    const before_three_days = new Date(today);
    before_three_days.setDate(today.getDate() - 2);
    const setupTest = (
      stats: {
        date: string;
        focusModes: number;
        morning: number;
        evening: number;
        microBreaks: number;
      }[],
      numDays: number,
      numDaysComplete: number,
      percentMorning: number,
      percentEvening: number,
      percentMicro: number,
    ) => {
      const userDailyStats = stats.map((stat) => ({
        date_completed: new Date(stat.date),
        focus_modes_completed: stat.focusModes,
        morning_routine_completion_percentage: stat.morning,
        evening_routine_completion_percentage: stat.evening,
        micro_breaks_routine_completion_percentage: stat.microBreaks,
        created_at: new Date(stat.date).toISOString(),
        updated_at: new Date(stat.date).toISOString(),
      }));

      const expected = {
        focus_modes_streak: 0,
        morning_routines_streak: 0,
        evening_routines_streak: 0,
        micro_breaks_streak: 0,
        percent_morning_routines_streak_complete_in_90days: percentMorning,
        percent_evening_routines_streak_complete_in_90days: percentEvening,
        percent_micro_breaks_streak_complete_in_90days: percentMicro,
        num_days_of_stats: numDays,
        number_days_completed: numDaysComplete,
      };

      return { userDailyStats, expected };
    };

    const runTest = (dailyStats, expected) => {
      const result = calculateStreaks(dailyStats, timeZone, {
        morningRoutineDailyDurations: morningRoutineDailyDurations,
        eveningRoutineDailyDurations: eveningRoutineDailyDurations,
        microBreaksDailyDurations: microBreaksDailyDurations,
      });
      expect(result).toEqual(expected);
    };

    it('should calculate streaks correctly for given daily stats', () => {
      const { userDailyStats, expected } = setupTest(
        [
          { date: yesterday.toISOString(), focusModes: 1, morning: 100, evening: 100, microBreaks: 100 },
          { date: before_yesterday.toISOString(), focusModes: 1, morning: 100, evening: 100, microBreaks: 100 },
        ],
        2,
        2,
        100,
        100,
        100,
      );

      runTest(userDailyStats, expected);
    });

    it('should return zero streaks for empty daily stats', () => {
      const { userDailyStats, expected } = setupTest([], 0, 0, 0, 0, 0);

      runTest(userDailyStats, expected);
    });

    it('should return zero streaks when no routines are completed', () => {
      const { userDailyStats, expected } = setupTest(
        [{ date: yesterday.toISOString(), focusModes: 0, morning: 0, evening: 0, microBreaks: 0 }],
        1,
        0,
        0,
        0,
        0,
      );

      runTest(userDailyStats, expected);
    });

    it('should calculate streaks correctly with partial completions', () => {
      const { userDailyStats, expected } = setupTest(
        [
          { date: yesterday.toISOString(), focusModes: 1, morning: 100, evening: 50, microBreaks: 100 },
          { date: before_yesterday.toISOString(), focusModes: 1, morning: 0, evening: 100, microBreaks: 100 },
        ],
        2,
        2,
        50,
        100,
        100,
      );

      runTest(userDailyStats, expected);
    });

    it('should handle cases with less than 90 days of stats', () => {
      const { userDailyStats, expected } = setupTest(
        [
          { date: yesterday.toISOString(), focusModes: 1, morning: 100, evening: 100, microBreaks: 100 },
          { date: before_yesterday.toISOString(), focusModes: 1, morning: 100, evening: 100, microBreaks: 100 },
          { date: before_three_days.toISOString(), focusModes: 1, morning: 50, evening: 50, microBreaks: 10 },
        ],
        2,
        2,
        100,
        100,
        100,
      );

      runTest(userDailyStats, expected);
    });

    it('should calculate number_days_completed correctly', () => {
      const { userDailyStats, expected } = setupTest(
        [
          { date: yesterday.toISOString(), focusModes: 1, morning: 100, evening: 100, microBreaks: 100 },
          { date: before_yesterday.toISOString(), focusModes: 0, morning: 0, evening: 0, microBreaks: 0 },
          { date: before_three_days.toISOString(), focusModes: 1, morning: 100, evening: 0, microBreaks: 100 },
        ],
        3,
        2,
        67,
        33,
        67,
      );

      runTest(userDailyStats, expected);
    });
  });
});
