import { DateTime } from 'luxon';
import { DailyStats } from '../../apps/api-server/src/modules/user/entities/user-daily-stats.entity';
import { TasksStreaksResponse } from '../../apps/api-server/src/modules/user/domain/tasks-streaks-response.model';
import { UserOnboardingProgress } from '../../apps/api-server/src/modules/user/domain/user-onboarding-progress.model';
import { BASE_ONBOARDING_PROGRESS, LUXON_WEEK_DAYS, LEVEL_THRESHOLDS, DAYS_OF_WEEK } from './constants';
import { ActivityType } from '../../apps/api-server/src/modules/activity/domain/activity-type.enum';
import { DailySequenceDurations } from '../../apps/api-server/src/modules/activity/domain/daily-sequence-durations.model';
import { ROUTINE_COMPLETION_PERCENTAGE_THRESHOLD } from '../../apps/api-server/src/shared/utils/constants';

export function findDifferenceInSeconds(startTime: Date, finishTime: Date) {
  const start = DateTime.fromJSDate(startTime);
  const end = DateTime.fromJSDate(finishTime);
  return end.diff(start, ['seconds']).toObject().seconds;
}

function isValidStreak(streak: number): boolean {
  return !Number.isNaN(streak) && streak !== Infinity && streak !== -Infinity;
}

export function determineUserLevel(
  onboardingProgress: UserOnboardingProgress,
  { focus_modes_streak, morning_routines_streak, evening_routines_streak, micro_breaks_streak }: TasksStreaksResponse,
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
    const areEnoughMicroBreakRoutinesCompleted = micro_breaks_streak >= currentLevelBeingChecked.routines;

    // Adding the condition for micro breaks streak progression
    // Level 1 and Level 2 users can bypass the micro breaks requirement
    // Micro breaks only required from Level 3 and above
    const isMicroBreaksBypassLevel = currentLevelBeingChecked.level === 1 || currentLevelBeingChecked.level === 2;
    const microBreaksRequirementMet = isMicroBreaksBypassLevel || areEnoughMicroBreakRoutinesCompleted;

    if (
      areEnoughMorningRoutinesCompleted &&
      areEnoughEveningRoutinesCompleted &&
      areEnoughFocusModesCompleted &&
      microBreaksRequirementMet
    ) {
      level = currentLevelBeingChecked.level;
      currentLevelIndex += 1;
    } else {
      areAllThresholdsMet = false;
    }
  }
  return level;
}

export function calculateRoutineStatsIn90Days(userDailyStats: DailyStats[], userCreatedAt: Date) {
  const currentDate = new Date();
  currentDate.setDate(currentDate.getDate() - 90);
  
  // Calculate days since user signup (for users < 90 days old)
  const userSignupDate = new Date(userCreatedAt);
  const daysSinceSignup = Math.floor((Date.now() - userSignupDate.getTime()) / (1000 * 60 * 60 * 24));
  
  // Determine the proper time window for this user
  const timeWindowStart = daysSinceSignup >= 90 ? currentDate : userSignupDate;
  const totalPossibleDays = daysSinceSignup >= 90 ? 90 : daysSinceSignup;

  const distinctUserDailyStatObject = userDailyStats.reduce((acc, current) => {
    const createdAtDate = new Date(current.created_at).toISOString().split('T')[0];
    if (!acc[createdAtDate]) {
      acc[createdAtDate] = {
        created_at: current.created_at,
        morning_routine_completion_percentage: current.morning_routine_completion_percentage,
        evening_routine_completion_percentage: current.evening_routine_completion_percentage,
        micro_breaks_routine_completion_percentage: current.micro_breaks_routine_completion_percentage,
        focus_modes_completed: current.focus_modes_completed,
        seconds_spent_doing_breaks: current.seconds_spent_doing_breaks,
      };
    } else {
      acc[createdAtDate].morning_routine_completion_percentage = Math.max(
        acc[createdAtDate].morning_routine_completion_percentage,
        current.morning_routine_completion_percentage,
      );
      acc[createdAtDate].evening_routine_completion_percentage = Math.max(
        acc[createdAtDate].evening_routine_completion_percentage,
        current.evening_routine_completion_percentage,
      );
      acc[createdAtDate].micro_breaks_routine_completion_percentage = Math.max(
        acc[createdAtDate].micro_breaks_routine_completion_percentage,
        current.micro_breaks_routine_completion_percentage,
      );
      acc[createdAtDate].focus_modes_completed = Math.max(
        acc[createdAtDate].focus_modes_completed,
        current.focus_modes_completed,
      );
      acc[createdAtDate].seconds_spent_doing_breaks = Math.max(
        acc[createdAtDate].seconds_spent_doing_breaks,
        current.seconds_spent_doing_breaks,
      );
    }
    return acc;
  }, {});

  const distinctUserDailyStats = Object.values(distinctUserDailyStatObject);

  const userDailyStatsFromLast90Days = distinctUserDailyStats.filter((f) => new Date(f.created_at) >= timeWindowStart);

  const daysWhereMorningRoutinesWereCompletedIn90Days = userDailyStatsFromLast90Days.filter(
    (dailyStat) => dailyStat.morning_routine_completion_percentage >= ROUTINE_COMPLETION_PERCENTAGE_THRESHOLD,
  );

  const daysWhereEveningRoutinesWereCompletedIn90Days = userDailyStatsFromLast90Days.filter(
    (dailyStat) => dailyStat.evening_routine_completion_percentage >= ROUTINE_COMPLETION_PERCENTAGE_THRESHOLD,
  );

  const daysWhereMicroBreaksWereCompletedIn90Days = userDailyStatsFromLast90Days.filter(
    (dailyStat) => dailyStat.seconds_spent_doing_breaks > 0,
  );

  const daysWhereFocusModesWereCompletedIn90Days = userDailyStatsFromLast90Days.filter(
    (dailyStat) => dailyStat.focus_modes_completed > 0, // At least one focus mode completed in the day
  );

  const num_days_of_stats = totalPossibleDays; // Use total possible days instead of actual activity days

  const number_days_completed = userDailyStatsFromLast90Days.filter(
    (f) =>
      f.morning_routine_completion_percentage >= ROUTINE_COMPLETION_PERCENTAGE_THRESHOLD ||
      f.evening_routine_completion_percentage >= ROUTINE_COMPLETION_PERCENTAGE_THRESHOLD ||
      f.seconds_spent_doing_breaks > 0 ||
      f.focus_modes_completed > 0,
  ).length;

  return {
    daysWhereMorningRoutinesWereCompletedIn90Days,
    daysWhereEveningRoutinesWereCompletedIn90Days,
    daysWhereMicroBreaksWereCompletedIn90Days,
    daysWhereFocusModesWereCompletedIn90Days,
    num_days_of_stats,
    number_days_completed,
    userDailyStatsFromLast90Days,
    morning_number_days_completed: daysWhereMorningRoutinesWereCompletedIn90Days.length,
    morning_num_days_of_stats: num_days_of_stats,
    evening_number_days_completed: daysWhereEveningRoutinesWereCompletedIn90Days.length,
    evening_num_days_of_stats: num_days_of_stats,
    micro_breaks_number_days_completed: daysWhereMicroBreaksWereCompletedIn90Days.length,
    micro_breaks_num_days_of_stats: num_days_of_stats,
    focus_modes_number_days_completed: daysWhereFocusModesWereCompletedIn90Days.length,
    focus_modes_num_days_of_stats: num_days_of_stats,
  };
}

function getLatestStatAndStartOfPrevDay(userDailyStats: DailyStats[], timeZone: string) {
  // sort stats in reverse-chronological order
  const orderedStats = userDailyStats;
  orderedStats.sort((precedingStat, followingStat) => {
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
  if (latestStatStartTime.valueOf() < startOfPreviousDay.valueOf()) {
    return 0;
  }
  let streak = 0;
  let index = 0;
  let currentDate = DateTime.fromMillis(userDailyStats[index].date_completed.valueOf()).setZone(timeZone);
  while (index < userDailyStats.length) {
    const currentStat = userDailyStats[index];
    const currentStatDate = DateTime.fromMillis(currentStat.date_completed.valueOf()).setZone(timeZone);
    const correctedPrevDayIndex = (currentDate.weekday - 1 + 6) % 7; // // luxon currentDate.weekday is 1-7 for Monday-Sunday
    const prevDayOfWeek = DAYS_OF_WEEK[correctedPrevDayIndex];
    const doesPrevDayHasActivities = dailySequenceDurations[prevDayOfWeek] > 0;
    const doesCurrentDayHasActivities = dailySequenceDurations[DAYS_OF_WEEK[currentDate.weekday - 1]] > 0; // Prevents streak reset by treating the previous day as the current day in the next iteration.
    if (currentStatDate.hasSame(currentDate, 'day') || !doesPrevDayHasActivities || !doesCurrentDayHasActivities) {
      if (currentStatDate.hasSame(currentDate, 'day')) {
        streak += 1;
        index++;
      }
    } else {
      break;
    }
    currentDate = currentDate.minus({ days: 1 });
  }
  return isValidStreak(streak) ? streak : 0;
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

export function calculateStreakForWeekdaysOnly(userDailyStats: DailyStats[], timeZone: string) {
  if (userDailyStats.length === 0) {
    return 0;
  }

  const { latestStatStartTime, startOfPreviousDay } = getLatestStatAndStartOfPrevDay(userDailyStats, timeZone);
  const startOfPrevWorkDay = getStartOfPrevWeekDay(startOfPreviousDay);

  if (latestStatStartTime.valueOf() < startOfPrevWorkDay.valueOf()) {
    return 0;
  }

  let streak = 0;
  let index = 0;

  let currentDate = DateTime.fromMillis(userDailyStats[index].date_completed.valueOf()).setZone(timeZone);

  while (index < userDailyStats.length) {
    const currentStat = userDailyStats[index];
    const currentStatDate = DateTime.fromMillis(currentStat.date_completed.valueOf()).setZone(timeZone);
    const isNonWeekday = !LUXON_WEEK_DAYS.includes(currentStatDate.weekday);

    if (currentStatDate.hasSame(currentDate, 'day') || isNonWeekday) {
      if (currentStatDate.hasSame(currentDate, 'day')) {
        streak += 1;
        currentDate = currentDate.minus({ days: 1 });
        while (!LUXON_WEEK_DAYS.includes(currentDate.weekday)) {
          currentDate = currentDate.minus({ days: 1 });
        }
      }
      index++;
    } else {
      break;
    }
  }

  return isValidStreak(streak) ? streak : 0;
}

export function calculateStreakForFocusModes(userDailyStats: DailyStats[], timeZone: string) {
  return calculateStreakForWeekdaysOnly(userDailyStats, timeZone);
}

export function calculateStreakForMicroBreaks(userDailyStats: DailyStats[], timeZone: string) {
  return calculateStreakForWeekdaysOnly(userDailyStats, timeZone);
}

export function calculateStreaks(
  userDailyStats: DailyStats[],
  timeZone: string,
  {
    morningRoutineDailyDurations,
    eveningRoutineDailyDurations,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    microBreaksDailyDurations, // Not used in simplified micro break logic
  }: {
    morningRoutineDailyDurations: DailySequenceDurations;
    eveningRoutineDailyDurations: DailySequenceDurations;
    microBreaksDailyDurations: DailySequenceDurations;
  },
  userCreatedAt: Date,
): TasksStreaksResponse {
  const daysWhereFocusModesWereCompleted = userDailyStats.filter((dailyStat) => dailyStat.focus_modes_completed > 0);
  const daysWhereMorningRoutinesWereCompleted = userDailyStats.filter(
    (dailyStat) => dailyStat.morning_routine_completion_percentage >= ROUTINE_COMPLETION_PERCENTAGE_THRESHOLD,
  );
  const daysWhereEveningRoutinesWereCompleted = userDailyStats.filter(
    (dailyStat) => dailyStat.evening_routine_completion_percentage >= ROUTINE_COMPLETION_PERCENTAGE_THRESHOLD,
  );
  // Simplified micro break completion logic: if any time was spent doing breaks that day, count it as completed
  const daysWhereMicroBreaksWereCompleted = userDailyStats.filter(
    (dailyStat) => dailyStat.seconds_spent_doing_breaks > 0,
  );

  // calculate the tasks complete in 90 days (percent)
  const {
    daysWhereEveningRoutinesWereCompletedIn90Days,
    daysWhereMicroBreaksWereCompletedIn90Days,
    daysWhereMorningRoutinesWereCompletedIn90Days,
    daysWhereFocusModesWereCompletedIn90Days,
    num_days_of_stats,
    number_days_completed,
    userDailyStatsFromLast90Days,
    morning_number_days_completed,
    morning_num_days_of_stats,
    evening_number_days_completed,
    evening_num_days_of_stats,
    micro_breaks_number_days_completed,
    micro_breaks_num_days_of_stats,
    focus_modes_number_days_completed,
    focus_modes_num_days_of_stats,
  } = calculateRoutineStatsIn90Days(userDailyStats, userCreatedAt);

  const focus_modes_streak = calculateStreakForFocusModes(daysWhereFocusModesWereCompleted, timeZone);
  const morning_routines_streak = calculateStreakForRoutine(
    daysWhereMorningRoutinesWereCompleted,
    timeZone,
    morningRoutineDailyDurations,
  );
  const evening_routines_streak = calculateStreakForRoutine(
    daysWhereEveningRoutinesWereCompleted,
    timeZone,
    eveningRoutineDailyDurations,
  );

  const micro_breaks_streak = calculateStreakForMicroBreaks(daysWhereMicroBreaksWereCompleted, timeZone);

  return {
    focus_modes_streak: isValidStreak(focus_modes_streak) ? focus_modes_streak : 0,
    morning_routines_streak: isValidStreak(morning_routines_streak) ? morning_routines_streak : 0,
    evening_routines_streak: isValidStreak(evening_routines_streak) ? evening_routines_streak : 0,
    micro_breaks_streak: isValidStreak(micro_breaks_streak) ? micro_breaks_streak : 0,
    percent_morning_routines_streak_complete_in_90days:
      num_days_of_stats > 0
        ? Math.round((daysWhereMorningRoutinesWereCompletedIn90Days.length / num_days_of_stats) * 100)
        : 0,
    percent_evening_routines_streak_complete_in_90days:
      num_days_of_stats > 0
        ? Math.round((daysWhereEveningRoutinesWereCompletedIn90Days.length / num_days_of_stats) * 100)
        : 0,
    percent_micro_breaks_streak_complete_in_90days:
      num_days_of_stats > 0
        ? Math.round((daysWhereMicroBreaksWereCompletedIn90Days.length / num_days_of_stats) * 100)
        : 0,
    num_days_of_stats,
    number_days_completed,
    morning_number_days_completed,
    morning_num_days_of_stats,
    evening_number_days_completed,
    evening_num_days_of_stats,
    micro_breaks_number_days_completed,
    micro_breaks_num_days_of_stats,
    focus_modes_number_days_completed,
    focus_modes_num_days_of_stats,
  };
}

export function calculateRoutineCompletionPercentageAverage(dailyStats: DailyStats[], routineType: ActivityType) {
  let routineToCount = 'micro_breaks_routine_completion_percentage';
  if (routineType === ActivityType.morning) {
    routineToCount = 'morning_routine_completion_percentage';
  } else if (routineType === ActivityType.evening) {
    routineToCount = 'evening_routine_completion_percentage';
  }
  const totalCompletion = dailyStats.reduce(
    (total, stat) => total + (!Number.isNaN(stat[routineToCount]) ? stat[routineToCount] : 0),
    0,
  );
  const averageCompletion = dailyStats.length > 0 ? totalCompletion / dailyStats.length : 0;
  const percentage = Math.round(averageCompletion);
  return percentage > 100 ? 100 : percentage;
}

export function calculateAverageFocusModesCompleted(dailyStats: DailyStats[]) {
  const totalFocusModesCompleted = dailyStats.reduce(
    (total, currentStat) => total + currentStat.focus_modes_completed,
    0,
  );
  return dailyStats?.length > 0 ? Number((totalFocusModesCompleted / dailyStats.length).toFixed(1)) : 0;
}

export function getRoutinesAndFocusModesAverages(dailyStats: DailyStats[]) {
  const morningRoutineAverage = calculateRoutineCompletionPercentageAverage(dailyStats, ActivityType.morning);
  const eveningRoutineAverage = calculateRoutineCompletionPercentageAverage(dailyStats, ActivityType.evening);
  const focusModesAverage = calculateAverageFocusModesCompleted(dailyStats);
  const breakRoutineAverage = calculateRoutineCompletionPercentageAverage(dailyStats, ActivityType.break);
  return {
    morningRoutineAverage,
    eveningRoutineAverage,
    focusModesAverage,
    breakRoutineAverage,
  };
}

export function isValidUUID(value: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

