import { DateTime } from 'luxon';
import { DummyTasksStreaksResponse } from '../../apps/api-server/test/dummies';
import { TasksStreaksResponse } from '../../apps/api-server/src/modules/user/domain/tasks-streaks-response.model';
import { UserOnboardingProgress } from '../../apps/api-server/src/modules/user/domain/user-onboarding-progress.model';
import { LEVEL_THRESHOLDS } from './constants';
import { calculateStreaks, determineUserLevel } from './helpers';
import { DailySequenceDurations } from '../../apps/api-server/src/modules/activity/domain/daily-sequence-durations.model';
import { ROUTINE_COMPLETION_PERCENTAGE_THRESHOLD } from '../../apps/api-server/src/shared/utils/constants';

describe('helpers', () => {
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

    it('should assign level 1 with minimum streaks and complete setup (no micro breaks required)', () => {
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

    it('should reach level 2 without micro breaks requirement', () => {
      const onboardingProgress = new UserOnboardingProgress();
      onboardingProgress.has_edited_focus_mode = true;
      onboardingProgress.has_edited_settings = true;
      onboardingProgress.has_edited_always_blocked_urls = true;
      onboardingProgress.has_installed_desktop_app = true;
      // Level 2 requirements: routines >= 2, focus_modes >= 2, micro breaks not required
      const tasksStreaksResponse = new TasksStreaksResponse({
        focus_modes_streak: 2,
        morning_routines_streak: 2,
        evening_routines_streak: 2,
        micro_breaks_streak: 0, // Should not be required for level 2
      });

      const level = determineUserLevel(onboardingProgress, tasksStreaksResponse);
      expect(level).toBe(2);
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

    it('should require micro breaks for level 3 and above', () => {
      const onboardingProgress = new UserOnboardingProgress();
      onboardingProgress.has_edited_focus_mode = true;
      onboardingProgress.has_edited_settings = true;
      onboardingProgress.has_edited_always_blocked_urls = true;
      onboardingProgress.has_installed_desktop_app = true;
      // Level 3 requirements: routines >= 5, focus_modes >= 5, micro breaks >= 5
      const tasksStreaksResponse = new TasksStreaksResponse({
        focus_modes_streak: 5,
        morning_routines_streak: 5,
        evening_routines_streak: 5,
        micro_breaks_streak: 4, // Just below level 3 requirement
      });

      const level = determineUserLevel(onboardingProgress, tasksStreaksResponse);
      expect(level).toBe(2); // Should stay at level 2 due to insufficient micro breaks
    });

    it('should reach level 3 when micro breaks requirement is met', () => {
      const onboardingProgress = new UserOnboardingProgress();
      onboardingProgress.has_edited_focus_mode = true;
      onboardingProgress.has_edited_settings = true;
      onboardingProgress.has_edited_always_blocked_urls = true;
      onboardingProgress.has_installed_desktop_app = true;
      const tasksStreaksResponse = new TasksStreaksResponse({
        focus_modes_streak: 5,
        morning_routines_streak: 5,
        evening_routines_streak: 5,
        micro_breaks_streak: 5, // Meets level 3 requirement
      });

      const level = determineUserLevel(onboardingProgress, tasksStreaksResponse);
      expect(level).toBe(3);
    });
  });

  describe('calculateStreaks', () => {
    function getLastWeekSpecificDay(date: DateTime, weekday: number, weeks?: number): DateTime {
      const startOfThisWeek = date.startOf('week');
      const startOfLastWeek = startOfThisWeek.minus({ weeks: weeks || 1 });
      return startOfLastWeek.plus({ days: weekday - 1 });
    }

    const today = DateTime.local();
    const lastWeekMonday = getLastWeekSpecificDay(today, 1).toISODate();
    const lastWeekTuesday = getLastWeekSpecificDay(today, 2).toISODate();
    const lastWeekWednesday = getLastWeekSpecificDay(today, 3).toISODate();
    const beforeNinetyOneDays = getLastWeekSpecificDay(today, 5, 6).toISODate();

    const setupTest = (
      stats: {
        date: string;
        focusModes: number;
        morning: number;
        evening: number;
        microBreaks: number;
      }[],
      userSignupDaysAgo: number,
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
        created_at: new Date(stat.date),
        updated_at: new Date(stat.date),
      }));

      // Calculate morning, evening, and microBreaks specific counts using the threshold
      const morningCompleted = stats.filter(stat => stat.morning >= ROUTINE_COMPLETION_PERCENTAGE_THRESHOLD).length;
      const eveningCompleted = stats.filter(stat => stat.evening >= ROUTINE_COMPLETION_PERCENTAGE_THRESHOLD).length;
      const microBreaksCompleted = stats.filter(stat => stat.microBreaks >= ROUTINE_COMPLETION_PERCENTAGE_THRESHOLD).length;

      // Calculate num_days_of_stats based on user signup date
      const numDays = userSignupDaysAgo >= 90 ? 90 : userSignupDaysAgo;

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
        morning_number_days_completed: morningCompleted,
        morning_num_days_of_stats: numDays,
        evening_number_days_completed: eveningCompleted,
        evening_num_days_of_stats: numDays,
      };

      return { userDailyStats, expected };
    };

    const runTest = (dailyStats, expected, userSignupDaysAgo: number) => {
      const userCreatedAt = DateTime.local().minus({ days: userSignupDaysAgo }).toJSDate();
      const result = calculateStreaks(dailyStats, timeZone, {
        morningRoutineDailyDurations,
        eveningRoutineDailyDurations,
        microBreaksDailyDurations,
      }, userCreatedAt);
      expect(result).toEqual(expected);
    };

    it('should calculate streaks correctly for given daily stats', () => {
      const userSignupDaysAgo = 100; // User signed up more than 90 days ago
      const { userDailyStats, expected } = setupTest(
        [
          { date: lastWeekMonday, focusModes: 1, morning: 100, evening: 100, microBreaks: 100 },
          {
            date: lastWeekTuesday,
            focusModes: 1,
            morning: 100,
            evening: 100,
            microBreaks: 100,
          },
        ],
        userSignupDaysAgo,
        2,
        2, // 2/90 = 2.22% ≈ 2% (2 completed out of 90 possible days)
        2,
        2,
      );

      runTest(userDailyStats, expected, userSignupDaysAgo);
    });

    it('should return zero streaks for empty daily stats', () => {
      const userSignupDaysAgo = 100;
      const { userDailyStats, expected } = setupTest([], userSignupDaysAgo, 0, 0, 0, 0);

      runTest(userDailyStats, expected, userSignupDaysAgo);
    });

    it('should return zero streaks when no routines are completed', () => {
      const userSignupDaysAgo = 100;
      const { userDailyStats, expected } = setupTest(
        [{ date: lastWeekMonday, focusModes: 0, morning: 0, evening: 0, microBreaks: 0 }],
        userSignupDaysAgo,
        0,
        0,
        0,
        0,
      );

      runTest(userDailyStats, expected, userSignupDaysAgo);
    });

    it('should calculate streaks correctly with partial completions', () => {
      const userSignupDaysAgo = 100;
      const { userDailyStats, expected } = setupTest(
        [
          { date: lastWeekMonday, focusModes: 1, morning: 100, evening: 50, microBreaks: 100 },
          { date: lastWeekTuesday, focusModes: 1, morning: 0, evening: 100, microBreaks: 100 },
        ],
        userSignupDaysAgo,
        2,
        1, // 1/90 = 1.11% ≈ 1% (1 completed morning out of 90 possible days)
        2, // 2/90 = 2.22% ≈ 2% (2 completed evening out of 90 possible days)
        2, // 2/90 = 2.22% ≈ 2% (2 completed micro breaks out of 90 possible days)
      );

      runTest(userDailyStats, expected, userSignupDaysAgo);
    });

    it('should handle cases with less than 90 days of stats', () => {
      const userSignupDaysAgo = 100;
      const { userDailyStats, expected } = setupTest(
        [
          { date: lastWeekTuesday, focusModes: 1, morning: 100, evening: 100, microBreaks: 100 },
          { date: lastWeekWednesday, focusModes: 1, morning: 100, evening: 100, microBreaks: 100 },
          { date: beforeNinetyOneDays, focusModes: 1, morning: 50, evening: 50, microBreaks: 10 },
        ],
        userSignupDaysAgo,
        3,
        3, // 3/90 = 3.33% ≈ 3% (3 completed days out of 90 possible)
        3,
        3,
      );

      runTest(userDailyStats, expected, userSignupDaysAgo);
    });

    it('should calculate number_days_completed correctly', () => {
      const userSignupDaysAgo = 100;
      const { userDailyStats, expected } = setupTest(
        [
          { date: lastWeekMonday, focusModes: 1, morning: 100, evening: 100, microBreaks: 100 },
          { date: lastWeekTuesday, focusModes: 0, morning: 0, evening: 0, microBreaks: 0 },
          { date: lastWeekWednesday, focusModes: 1, morning: 100, evening: 0, microBreaks: 100 },
        ],
        userSignupDaysAgo,
        2,
        2, // 2/90 = 2.22% ≈ 2% (2 completed morning out of 90 possible days)
        1, // 1/90 = 1.11% ≈ 1% (1 completed evening out of 90 possible days)
        2, // 2/90 = 2.22% ≈ 2% (2 completed micro breaks out of 90 possible days)
      );

      runTest(userDailyStats, expected, userSignupDaysAgo);
    });

    it('should calculate stats correctly for users who signed up less than 90 days ago', () => {
      const userSignupDaysAgo = 30; // User signed up 30 days ago
      const { userDailyStats, expected } = setupTest(
        [
          { date: DateTime.local().minus({ days: 5 }).toISODate(), focusModes: 1, morning: 100, evening: 100, microBreaks: 100 },
          { date: DateTime.local().minus({ days: 10 }).toISODate(), focusModes: 1, morning: 100, evening: 0, microBreaks: 100 },
          { date: DateTime.local().minus({ days: 20 }).toISODate(), focusModes: 0, morning: 0, evening: 100, microBreaks: 0 },
        ],
        userSignupDaysAgo, // 30 days
        3, // 3 days with any activity
        7, // 2/30 = 6.67% ≈ 7% (2 completed morning routines out of 30 possible days)
        7, // 2/30 = 6.67% ≈ 7% (2 completed evening routines out of 30 possible days)
        7, // 2/30 = 6.67% ≈ 7% (2 completed micro breaks out of 30 possible days)
      );

      runTest(userDailyStats, expected, userSignupDaysAgo);
    });

    // Additional tests for 90-day leaderboard logic
    it('should handle user signed up exactly 90 days ago', () => {
      const userSignupDaysAgo = 90; // Boundary case
      const { userDailyStats, expected } = setupTest(
        [
          { date: DateTime.local().minus({ days: 5 }).toISODate(), focusModes: 1, morning: 100, evening: 100, microBreaks: 100 },
          { date: DateTime.local().minus({ days: 50 }).toISODate(), focusModes: 1, morning: 100, evening: 100, microBreaks: 100 },
        ],
        userSignupDaysAgo,
        2,
        2, // 2/90 = 2.22% ≈ 2% (2 completed days out of 90 possible)
        2,
        2,
      );

      runTest(userDailyStats, expected, userSignupDaysAgo);
    });

    it('should properly filter data outside 90-day window for leaderboard calculation', () => {
      const userSignupDaysAgo = 120; // User signed up > 90 days ago
      
      // Custom setup for this test since we need to account for filtering
      const userDailyStats = [
        {
          date_completed: new Date(DateTime.local().minus({ days: 10 }).toISODate()),
          focus_modes_completed: 1,
          morning_routine_completion_percentage: 100,
          evening_routine_completion_percentage: 100,
          micro_breaks_routine_completion_percentage: 100,
          created_at: new Date(DateTime.local().minus({ days: 10 }).toISODate()),
          updated_at: new Date(DateTime.local().minus({ days: 10 }).toISODate()),
        },
        {
          date_completed: new Date(DateTime.local().minus({ days: 95 }).toISODate()),
          focus_modes_completed: 1,
          morning_routine_completion_percentage: 100,
          evening_routine_completion_percentage: 100,
          micro_breaks_routine_completion_percentage: 100,
          created_at: new Date(DateTime.local().minus({ days: 95 }).toISODate()),
          updated_at: new Date(DateTime.local().minus({ days: 95 }).toISODate()),
        },
      ];

      const expected = {
        focus_modes_streak: 0,
        morning_routines_streak: 0,
        evening_routines_streak: 0,
        micro_breaks_streak: 0,
        percent_morning_routines_streak_complete_in_90days: 1, // 1/90 = 1.11% ≈ 1%
        percent_evening_routines_streak_complete_in_90days: 1,
        percent_micro_breaks_streak_complete_in_90days: 1,
        num_days_of_stats: 90,
        number_days_completed: 1, // Only 1 day within 90-day window
        morning_number_days_completed: 1, // Only 1 day within window
        morning_num_days_of_stats: 90,
        evening_number_days_completed: 1, // Only 1 day within window
        evening_num_days_of_stats: 90,
      };

      runTest(userDailyStats, expected, userSignupDaysAgo);
    });

    it('should calculate low percentage correctly for leaderboard (few active days)', () => {
      const userSignupDaysAgo = 100; // User signed up > 90 days ago
      const { userDailyStats, expected } = setupTest(
        [
          { date: DateTime.local().minus({ days: 5 }).toISODate(), focusModes: 1, morning: 100, evening: 100, microBreaks: 100 },
        ],
        userSignupDaysAgo,
        1,   // Only 1 day with activity
        1, // 1/90 = 1.11% ≈ 1% (1 completed day out of 90 possible)
        1,
        1,
      );

      runTest(userDailyStats, expected, userSignupDaysAgo);
    });

    it('should handle leaderboard comparison scenario between old and new users', () => {
      // Older user: 5 active days out of 90 possible = lower activity rate
      const olderUserSignupDaysAgo = 100;
      const { userDailyStats: olderUserStats, expected: olderExpected } = setupTest(
        [
          { date: DateTime.local().minus({ days: 10 }).toISODate(), focusModes: 1, morning: 100, evening: 100, microBreaks: 100 },
          { date: DateTime.local().minus({ days: 20 }).toISODate(), focusModes: 1, morning: 100, evening: 100, microBreaks: 100 },
          { date: DateTime.local().minus({ days: 30 }).toISODate(), focusModes: 1, morning: 100, evening: 100, microBreaks: 100 },
          { date: DateTime.local().minus({ days: 40 }).toISODate(), focusModes: 1, morning: 100, evening: 100, microBreaks: 100 },
          { date: DateTime.local().minus({ days: 50 }).toISODate(), focusModes: 1, morning: 100, evening: 100, microBreaks: 100 },
        ],
        olderUserSignupDaysAgo,
        5,   // 5 days with activity
        6, // 5/90 = 5.56% ≈ 6% (5 completed days out of 90 possible)
        6,
        6,
      );

      runTest(olderUserStats, olderExpected, olderUserSignupDaysAgo);

      // Newer user: 3 active days out of 15 possible = higher activity rate  
      const newerUserSignupDaysAgo = 15;
      const { userDailyStats: newerUserStats, expected: newerExpected } = setupTest(
        [
          { date: DateTime.local().minus({ days: 2 }).toISODate(), focusModes: 1, morning: 100, evening: 100, microBreaks: 100 },
          { date: DateTime.local().minus({ days: 5 }).toISODate(), focusModes: 1, morning: 100, evening: 100, microBreaks: 100 },
          { date: DateTime.local().minus({ days: 10 }).toISODate(), focusModes: 1, morning: 100, evening: 100, microBreaks: 9 },
        ],
        newerUserSignupDaysAgo,
        3,   // 3 days with activity  
        20, // 3/15 = 20% (3 completed days out of 15 possible)
        20,
        13, // 2/15 = 13.33% ≈ 13% (2 completed micro breaks out of 15 possible days)
      );

      // Fix the expected focus_modes_streak since most recent day (2 days ago) has 1 focus mode
      newerExpected.focus_modes_streak = 1;

      runTest(newerUserStats, newerExpected, newerUserSignupDaysAgo);
    });

    it('should handle edge case where user has stats exactly at 90-day boundary', () => {
      const userSignupDaysAgo = 100;
      const exactlyNinetyDaysAgo = DateTime.local().minus({ days: 90 }).toISODate();
      
      // Custom setup since one day is exactly at the 90-day boundary
      const userDailyStats = [
        {
          date_completed: new Date(exactlyNinetyDaysAgo),
          focus_modes_completed: 1,
          morning_routine_completion_percentage: 100,
          evening_routine_completion_percentage: 100,
          micro_breaks_routine_completion_percentage: 100,
          created_at: new Date(exactlyNinetyDaysAgo),
          updated_at: new Date(exactlyNinetyDaysAgo),
        },
        {
          date_completed: new Date(DateTime.local().minus({ days: 10 }).toISODate()),
          focus_modes_completed: 1,
          morning_routine_completion_percentage: 100,
          evening_routine_completion_percentage: 100,
          micro_breaks_routine_completion_percentage: 100,
          created_at: new Date(DateTime.local().minus({ days: 10 }).toISODate()),
          updated_at: new Date(DateTime.local().minus({ days: 10 }).toISODate()),
        },
      ];

      const expected = {
        focus_modes_streak: 0,
        morning_routines_streak: 0,
        evening_routines_streak: 0,
        micro_breaks_streak: 0,
        percent_morning_routines_streak_complete_in_90days: 1, // 1/90 = 1.11% ≈ 1% (only the 10-day-ago entry is within window)
        percent_evening_routines_streak_complete_in_90days: 1,
        percent_micro_breaks_streak_complete_in_90days: 1,
        num_days_of_stats: 90,
        number_days_completed: 1, // Only 1 day within the 90-day window
        morning_number_days_completed: 1, // Only 1 day within window
        morning_num_days_of_stats: 90,
        evening_number_days_completed: 1, // Only 1 day within window
        evening_num_days_of_stats: 90,
      };

      runTest(userDailyStats, expected, userSignupDaysAgo);
    });

    it('should calculate correct percentages for leaderboard with mixed completion rates', () => {
      const userSignupDaysAgo = 100;
      const { userDailyStats, expected } = setupTest(
        [
          // Day 1: Full completion
          { date: DateTime.local().minus({ days: 10 }).toISODate(), focusModes: 1, morning: 100, evening: 100, microBreaks: 100 },
          // Day 2: Partial completion (morning above threshold)
          { date: DateTime.local().minus({ days: 20 }).toISODate(), focusModes: 1, morning: 40, evening: 100, microBreaks: 100 },
          // Day 3: No completion
          { date: DateTime.local().minus({ days: 30 }).toISODate(), focusModes: 0, morning: 0, evening: 0, microBreaks: 0 },
        ],
        userSignupDaysAgo,
        2, // Only 2 days had any meaningful activity
        2, // 2/90 = 2.22% ≈ 2% (2 completed morning routines out of 90 possible days)
        2, // 2/90 = 2.22% ≈ 2% (2 completed evening routines out of 90 possible days)  
        2, // 2/90 = 2.22% ≈ 2% (2 completed micro breaks out of 90 possible days)
      );

      runTest(userDailyStats, expected, userSignupDaysAgo);
    });
  });
});

