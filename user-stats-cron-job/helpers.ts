import { DateTime } from 'luxon';
import { DailyStats } from '../apps/api-server/src/modules/user/entities/user-daily-stats.entity';
import { TasksStreaksResponse } from '../apps/api-server/src/modules/user/domain/tasks-streaks-response.model';
import { UserOnboardingProgress } from '../apps/api-server/src/modules/user/domain/user-onboarding-progress.model';
import { BASE_ONBOARDING_PROGRESS, LUXON_WEEK_DAYS, LEVEL_THRESHOLDS, DAYS_OF_WEEK } from './constants';
import { ActivityType } from '../apps/api-server/src/modules/activity/domain/activity-type.enum';
import { DailySequenceDurations } from '../apps/api-server/src/modules/activity/domain/daily-sequence-durations.model';
import { ROUTINE_COMPLETION_PERCENTAGE_THRESHOLD } from '../apps/api-server/src/shared/utils/constatnts';

export function findDifferenceInSeconds(startTime: Date, finishTime: Date) {
  const start = DateTime.fromJSDate(startTime);
  const end = DateTime.fromJSDate(finishTime);
  return end.diff(start, ['seconds']).toObject().seconds;
}

export function determineUserLevel(
  onboardingProgress: UserOnboardingProgress,
  { focus_modes_streak, morning_routines_streak, evening_routines_streak }: TasksStreaksResponse,
) {
  let onboarding_progress = onboardingProgress;
  if (!onboarding_progress) {
    onboarding_progress = BASE_ONBOARDING_PROGRESS;
  }
  const {
    has_edited_focus_mode,
    has_edited_settings,
    has_edited_always_blocked_urls,
    has_installed_desktop_app,
    has_installed_mobile_app,
  } = onboarding_progress;
  const isSetupCompleted =
    has_edited_focus_mode &&
    has_edited_settings &&
    has_edited_always_blocked_urls &&
    (has_installed_desktop_app || has_installed_mobile_app);
  if (!isSetupCompleted) {
    return 0;
  }
  let { level } = onboarding_progress;
  let currentLevelIndex = 0;
  let areAllThresholdsMet = true;
  while (areAllThresholdsMet && currentLevelIndex < LEVEL_THRESHOLDS.length) {
    const currentLevelBeingChecked = LEVEL_THRESHOLDS[currentLevelIndex];
    const areEnoughMorningRoutinesCompleted = morning_routines_streak >= currentLevelBeingChecked.routines;
    const areEnoughEveningRoutinesCompleted = evening_routines_streak >= currentLevelBeingChecked.routines;
    const areEnoughFocusModesCompleted = focus_modes_streak >= currentLevelBeingChecked.focus_modes;
    if (areEnoughMorningRoutinesCompleted && areEnoughEveningRoutinesCompleted && areEnoughFocusModesCompleted) {
      level = currentLevelBeingChecked.level;
      currentLevelIndex += 1;
    } else {
      areAllThresholdsMet = false;
    }
  }
  return level;
}

function getLatestStatAndStartOfPrevDay(userDailyStats: DailyStats[], timeZone: string) {
  // sort stats in reverse-chronological order
  const orderedStats = userDailyStats.sort((precedingStat, followingStat) => {
    const precedingCompletedDate = DateTime.fromJSDate(precedingStat.date_completed).valueOf();
    const followingCompletedDate = DateTime.fromJSDate(followingStat.date_completed).valueOf();
    return followingCompletedDate - precedingCompletedDate;
  });
  const latestStatStartTime = orderedStats[0]?.date_completed;
  const startOfPreviousDay = DateTime.local({ zone: timeZone }).minus({ days: 1 }).startOf('day').toJSDate();
  return { latestStatStartTime, startOfPreviousDay };
}

export function calculateStreakForRoutine(
  userDailyStats: DailyStats[],
  timeZone: string,
  dailySequenceDurations: DailySequenceDurations,
) {
  if (userDailyStats.length === 0) {
    return 0;
  }
  const { latestStatStartTime, startOfPreviousDay } = getLatestStatAndStartOfPrevDay(userDailyStats, timeZone);
  let streak = 0;
  // start counting from current day or prev day if no tasks have been done for current day
  // if user hasn't completed routine last 2 days streak is 0
  if (latestStatStartTime.valueOf() < startOfPreviousDay.valueOf()) {
    return 0;
  }
  const ONE_DAY_AS_MILLIS = 86400000;
  let index = 0;
  let currentStat = userDailyStats[index];
  let nextExpectedDate = currentStat.date_completed.valueOf();
  // gets day number ranging from 1 for Mon to 7 for Sun
  let dayBeingCheckedNumber = DateTime.fromMillis(nextExpectedDate).setZone(timeZone).weekday;
  let prevDayOfWeek = DAYS_OF_WEEK[dayBeingCheckedNumber - 1];
  let doesDayHaveActivities = dailySequenceDurations[prevDayOfWeek] > 0;
  // for this loop we loop backwards chronologically over the daily stat records to count the user's streak
  // if a day is encountered where the user has no activities we don't reset the streak, but simply hold the count
  while (currentStat && (currentStat.date_completed.valueOf() === nextExpectedDate || !doesDayHaveActivities)) {
    if (currentStat.date_completed.valueOf() === nextExpectedDate) {
      streak += 1;
      currentStat = userDailyStats[index + 1];
      index += 1;
    }
    nextExpectedDate -= ONE_DAY_AS_MILLIS;
    dayBeingCheckedNumber = DateTime.fromMillis(nextExpectedDate).weekday;
    prevDayOfWeek = DAYS_OF_WEEK[dayBeingCheckedNumber - 1];
    doesDayHaveActivities = dailySequenceDurations[prevDayOfWeek] > 0;
  }
  return streak;
}

const getStartOfPrevWeekDay = (startOfPrevDay: Date) => {
  if (LUXON_WEEK_DAYS.includes(DateTime.fromJSDate(startOfPrevDay).weekday)) {
    return startOfPrevDay;
  }
  let dayToCheck = DateTime.fromJSDate(startOfPrevDay);
  while (!LUXON_WEEK_DAYS.includes(dayToCheck.weekday)) {
    dayToCheck = dayToCheck.minus({ days: 1 });
  }
  return dayToCheck.startOf('day').toJSDate();
};

export function calculateStreakForFocusModes(userDailyStats: DailyStats[], timeZone: string) {
  if (userDailyStats.length === 0) {
    return 0;
  }
  const { latestStatStartTime, startOfPreviousDay } = getLatestStatAndStartOfPrevDay(userDailyStats, timeZone);
  const startOfPrevWorkDay = getStartOfPrevWeekDay(startOfPreviousDay);
  // start counting from current day or prev day if no tasks have been done for current day
  // if user hasn't completed routine last 2 days streak is 0
  if (latestStatStartTime.valueOf() < startOfPrevWorkDay.valueOf()) {
    return 0;
  }
  const ONE_DAY_AS_MILLIS = 86400000;
  let streak = 0;
  let index = 0;
  let currentStat = userDailyStats[index];
  let nextExpectedDate = currentStat.date_completed.valueOf();
  let nextExpectedDayOfWeek = DateTime.fromMillis(nextExpectedDate).weekday;
  while (
    currentStat &&
    (currentStat.date_completed.valueOf() === nextExpectedDate || !LUXON_WEEK_DAYS.includes(nextExpectedDayOfWeek))
  ) {
    if (currentStat.date_completed.valueOf() === nextExpectedDate) {
      streak += 1;
      currentStat = userDailyStats[index + 1];
      index += 1;
    }
    nextExpectedDate -= ONE_DAY_AS_MILLIS;
    nextExpectedDayOfWeek = DateTime.fromMillis(nextExpectedDate).weekday;
  }
  return streak;
}

export function calculateStreaks(
  userDailyStats: DailyStats[],
  timeZone: string,
  {
    morningRoutineDailyDurations,
    eveningRoutineDailyDurations,
  }: {
    morningRoutineDailyDurations: DailySequenceDurations;
    eveningRoutineDailyDurations: DailySequenceDurations;
  },
): TasksStreaksResponse {
  const daysWhereFocusModesWereCompleted = userDailyStats.filter((dailyStat) => dailyStat.focus_modes_completed > 0);
  const daysWhereMorningRoutinesWereCompleted = userDailyStats.filter(
    (dailyStat) => dailyStat.morning_routine_completion_percentage >= ROUTINE_COMPLETION_PERCENTAGE_THRESHOLD,
  );
  const daysWhereEveningRoutinesWereCompleted = userDailyStats.filter(
    (dailyStat) => dailyStat.evening_routine_completion_percentage >= ROUTINE_COMPLETION_PERCENTAGE_THRESHOLD,
  );
  return {
    focus_modes_streak: calculateStreakForFocusModes(daysWhereFocusModesWereCompleted, timeZone),
    morning_routines_streak: calculateStreakForRoutine(
      daysWhereMorningRoutinesWereCompleted,
      timeZone,
      morningRoutineDailyDurations,
    ),
    evening_routines_streak: calculateStreakForRoutine(
      daysWhereEveningRoutinesWereCompleted,
      timeZone,
      eveningRoutineDailyDurations,
    ),
  };
}

export function calculateRoutineCompletionPercentageAverage(dailyStats: DailyStats[], routineType: ActivityType) {
  let routineToCount;
  if (routineType === ActivityType.morning) {
    routineToCount = 'morning_routine_completion_percentage';
  } else if (routineType === ActivityType.evening) {
    routineToCount = 'evening_routine_completion_percentage';
  }
  const totalCompletion = dailyStats.reduce(
    (total, stat) => total + (!Number.isNaN(stat[routineToCount]) ? stat[routineToCount] : 0),
    0,
  );
  const averageCompletion = totalCompletion / dailyStats.length;
  const percentage = Math.round(averageCompletion);
  return percentage > 100 ? 100 : percentage;
}

export function calculateAverageFocusModesCompleted(dailyStats: DailyStats[]) {
  const totalFocusModesCompleted = dailyStats.reduce(
    (total, currentStat) => total + currentStat.focus_modes_completed,
    0,
  );
  return Number((totalFocusModesCompleted / dailyStats.length).toFixed(1));
}

export function getRoutinesAndFocusModesAverages(dailyStats: DailyStats[]) {
  const morningRoutineAverage = calculateRoutineCompletionPercentageAverage(dailyStats, ActivityType.morning);
  const eveningRoutineAverage = calculateRoutineCompletionPercentageAverage(dailyStats, ActivityType.evening);
  const focusModesAverage = calculateAverageFocusModesCompleted(dailyStats);
  return {
    morningRoutineAverage,
    eveningRoutineAverage,
    focusModesAverage,
  };
}
