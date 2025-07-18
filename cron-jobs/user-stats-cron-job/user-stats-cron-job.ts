import { DateTime } from 'luxon';
import { LessThan } from 'typeorm';
import { DaysOfWeek } from '../../apps/api-server/src/modules/activity/domain/days-of-week.enum';
import { CompletedActivity } from '../../apps/api-server/src/modules/activity/entities/completed-activity.entity';
import { CompletedActivitySequence } from '../../apps/api-server/src/modules/activity/entities/completed-activity-sequence.entity';
import { User } from '../../apps/api-server/src/modules/user/entities/user.entity';
import { CronJobDataSource } from '../data-source';
import { calculateStreaks, determineUserLevel, isValidUUID } from './helpers';
import { DailyStats } from '../../apps/api-server/src/modules/user/entities/user-daily-stats.entity';
import { DailySequenceDurations } from '../../apps/api-server/src/modules/activity/domain/daily-sequence-durations.model';
import { ActivityType } from '../../apps/api-server/src/modules/activity/domain/activity-type.enum';
import { Activity } from '../../apps/api-server/src/modules/activity/entities/activity.entity';
import { DAYS_OF_WEEK } from './constants';
import { withSentry, captureErrorWithContext } from '../sentry';
import { withTimeout } from '../../apps/api-server/src/shared/utils/helpers';
import { CRON_JOB_TIMEOUT_MS } from '../../apps/api-server/src/shared/utils/constants';

function filterActivitiesForCurrentDay(currentDay: DaysOfWeek, activities: Activity[]) {
  const activitiesForCurrentDay = activities.filter(
    ({ days_of_week }) => days_of_week.includes(DaysOfWeek.ALL) || days_of_week.includes(currentDay),
  );
  return activitiesForCurrentDay;
}

function sumDurationOfActivities(activities: Activity[]) {
  return activities.reduce((total, { duration_seconds }) => total + Number(duration_seconds), 0);
}

function getSequenceDurationForDay(activities: Activity[], currentDay: DaysOfWeek) {
  const activitiesForCurrentDay = filterActivitiesForCurrentDay(currentDay, activities);
  return sumDurationOfActivities(activitiesForCurrentDay);
}

function calculateSequenceDurationForWeek(activities: Activity[]): DailySequenceDurations {
  const dailySequenceDurations = {
    MON: 0,
    TUE: 0,
    WED: 0,
    THU: 0,
    FRI: 0,
    SAT: 0,
    SUN: 0,
  };
  DAYS_OF_WEEK.forEach((day) => {
    const sequenceDuration = getSequenceDurationForDay(activities, day);
    dailySequenceDurations[day] = sequenceDuration;
  });
  return dailySequenceDurations;
}

async function getUserRoutineDailyDurations(user_id: string): Promise<{
  morningRoutineDailyDurations: DailySequenceDurations;
  eveningRoutineDailyDurations: DailySequenceDurations;
  microBreaksDailyDurations: DailySequenceDurations;
}> {
  const morningActivities = await CronJobDataSource.manager.find(Activity, {
    where: { user_id, type: ActivityType.morning },
  });
  const eveningActivities = await CronJobDataSource.manager.find(Activity, {
    where: { user_id, type: ActivityType.evening },
  });
  const breakActivities = await CronJobDataSource.manager.find(Activity, {
    where: { user_id, type: ActivityType.break },
  });
  const morningRoutineDailyDurations = calculateSequenceDurationForWeek(morningActivities);
  const eveningRoutineDailyDurations = calculateSequenceDurationForWeek(eveningActivities);
  const microBreaksDailyDurations = calculateSequenceDurationForWeek(breakActivities);
  return { morningRoutineDailyDurations, eveningRoutineDailyDurations, microBreaksDailyDurations };
}

async function getSequenceDurationForCurrentDay(routineLog: CompletedActivitySequence, userId: string) {
  const currentDayOfWeek = DateTime.fromJSDate(routineLog.start_time).weekdayShort;
  const { morningRoutineDailyDurations, eveningRoutineDailyDurations, microBreaksDailyDurations } =
    await getUserRoutineDailyDurations(userId);
  const sequenceType = routineLog.activity_sequence.type;
  let sequenceDurationForCurrentDay: number = 0;
  if (sequenceType === ActivityType.morning) {
    sequenceDurationForCurrentDay = morningRoutineDailyDurations[currentDayOfWeek.toUpperCase()];
  } else if (sequenceType === ActivityType.evening) {
    sequenceDurationForCurrentDay = eveningRoutineDailyDurations[currentDayOfWeek.toUpperCase()];
  } else if (sequenceType === ActivityType.break) {
    sequenceDurationForCurrentDay = microBreaksDailyDurations[currentDayOfWeek.toUpperCase()];
  }
  return sequenceDurationForCurrentDay;
}

async function calculateRoutineCompletionPercentage(
  user_id: string,
  completed_activity_log_id: string,
): Promise<number> {
  const existingRoutineLog = await CronJobDataSource.manager.findOne(CompletedActivitySequence, {
    where: {
      user_id,
      id: completed_activity_log_id,
    },
  });
  if (!existingRoutineLog) {
    return 0;
  }
  const activitiesFromRoutine = await CronJobDataSource.manager.find(CompletedActivity, {
    where: { completed_sequence_id: existingRoutineLog.id },
  });
  const activitiesThatWereCompleted = activitiesFromRoutine.filter(
    (activity) =>
      !activity.metadata?.is_skipped && !activity.metadata?.skipped_did_not_complete && activity.duration_logged > 0,
  );
  const totalDurationOfCompletedActivities = activitiesThatWereCompleted.reduce(
    (totalSeconds, { duration_logged }) => totalSeconds + Number(duration_logged),
    0,
  );
  const sequenceDurationForCurrentDay = await getSequenceDurationForCurrentDay(existingRoutineLog, user_id);

  // Validate to prevent "Infinity" or NaN
  if (
    !Number.isFinite(sequenceDurationForCurrentDay) ||
    sequenceDurationForCurrentDay <= 0 ||
    !Number.isFinite(totalDurationOfCompletedActivities) ||
    totalDurationOfCompletedActivities <= 0
  ) {
    console.warn(
      `Invalid sequenceDurationForCurrentDay or totalDurationOfCompletedActivities for user_id: ${user_id}, completed_activity_log_id: ${completed_activity_log_id}.`,
    );
    return 0;
  }

  const completionPercentage = (totalDurationOfCompletedActivities / sequenceDurationForCurrentDay) * 100;
  return Math.round(completionPercentage);
}

async function recalculateDailyStatRoutineCompletions(dailyStat: DailyStats) {
  const updatedDailyStat = dailyStat;
  if (isValidUUID(dailyStat.morning_sequence_log_id)) {
    updatedDailyStat.morning_routine_completion_percentage = await calculateRoutineCompletionPercentage(
      dailyStat.user_id,
      dailyStat.morning_sequence_log_id,
    );
  }
  if (isValidUUID(dailyStat.evening_sequence_log_id)) {
    updatedDailyStat.evening_routine_completion_percentage = await calculateRoutineCompletionPercentage(
      dailyStat.user_id,
      dailyStat.evening_sequence_log_id,
    );
  }
  if (isValidUUID(dailyStat.break_sequence_log_id)) {
    updatedDailyStat.micro_breaks_routine_completion_percentage = await calculateRoutineCompletionPercentage(
      dailyStat.user_id,
      dailyStat.break_sequence_log_id,
    );
  }
  updatedDailyStat.should_recalculate = false;
  CronJobDataSource.manager.update(DailyStats, { id: dailyStat.id }, updatedDailyStat);
}

async function calculateOfflineActivitiesCompletionPercentage() {
  try {
    const dailyStats = await CronJobDataSource.manager.find(DailyStats, { where: { should_recalculate: true } });
    for (const dailyStat of dailyStats) {
      try {
        await recalculateDailyStatRoutineCompletions(dailyStat);
      } catch (error) {
        console.error(`Failed to recalculate for dailyStat id ${dailyStat.id}:`, error);
      }
    }
  } catch (error) {
    console.error('Error calculating offline activities completion percentage:', error);
  }
}

async function runUserStatsCronJob() {
  await CronJobDataSource.initialize();
  await calculateOfflineActivitiesCompletionPercentage();
  const time24HoursAgo = DateTime.local().minus({ days: 1 }).toJSDate();
  const usersWhoseStatsAreOutOfDate = await CronJobDataSource.manager.find(User, {
    where: { last_time_stats_updated: LessThan(time24HoursAgo) },
    take: 50,
  });
  for await (const user of usersWhoseStatsAreOutOfDate) {
    const userDailyStats = await CronJobDataSource.manager.find(DailyStats, {
      where: {
        user_id: user.id,
      },
      order: { date_completed: 'DESC' },
    });
    const { morningRoutineDailyDurations, eveningRoutineDailyDurations, microBreaksDailyDurations } =
      await getUserRoutineDailyDurations(user.id);
    const { focus_modes_streak, morning_routines_streak, evening_routines_streak, micro_breaks_streak } =
      calculateStreaks(userDailyStats, user.timezone, {
        morningRoutineDailyDurations,
        eveningRoutineDailyDurations,
        microBreaksDailyDurations,
      });
    const userLevel = determineUserLevel(user.onboarding_progress, {
      focus_modes_streak,
      morning_routines_streak,
      evening_routines_streak,
      micro_breaks_streak,
    });
    const currentTime = DateTime.local({ zone: user.timezone }).toJSDate();
    await CronJobDataSource.manager.update(
      User,
      { id: user.id },
      {
        onboarding_progress: {
          ...user.onboarding_progress,
          level: userLevel,
        },
        last_time_stats_updated: currentTime,
        morning_routines_streak,
        evening_routines_streak,
        focus_modes_streak,
        micro_breaks_streak,
      },
    );
  }
  // eslint-disable-next-line no-console
  console.log(`Recalculated daily stats for ${usersWhoseStatsAreOutOfDate.length} users`);
  process.exit();
}

if (require.main === module) {
  withSentry(() => withTimeout(runUserStatsCronJob(), CRON_JOB_TIMEOUT_MS));
}
