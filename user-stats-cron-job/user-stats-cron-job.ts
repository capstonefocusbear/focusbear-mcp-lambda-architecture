import { DateTime } from 'luxon';
import { LessThan } from 'typeorm';
import { DaysOfWeek } from '../apps/api-server/src/modules/activity/domain/days-of-week.enum';
import { CompletedActivity } from '../apps/api-server/src/modules/activity/entities/completed-activity.entity';
import { CompletedActivitySequence } from '../apps/api-server/src/modules/activity/entities/completed-activity-sequence.entity';
import { User } from '../apps/api-server/src/modules/user/entities/user.entity';
import { CronJobDataSource } from './data-source';
import { calculateStreaks, determineUserLevel, findDifferenceInSeconds } from './helpers';
import { DailyStats } from '../apps/api-server/src/modules/user/entities/user-daily-stats.entity';
import { DailySequenceDurations } from '../apps/api-server/src/modules/activity/domain/daily-sequence-durations.model';
import { ActivityType } from '../apps/api-server/src/modules/activity/domain/activity-type.enum';
import { Activity } from '../apps/api-server/src/modules/activity/entities/activity.entity';
import { DAYS_OF_WEEK } from './constants';

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
    (activity) => !activity.metadata?.is_skipped && !activity.metadata?.skipped_did_not_complete,
  );
  const totalDurationOfCompletedActivities = activitiesThatWereCompleted.reduce(
    (acc, { start_time, finish_time }) => acc + findDifferenceInSeconds(start_time, finish_time),
    0,
  );
  const totalSequenceDuration = Number(existingRoutineLog.activity_sequence.sequenceDurationSeconds);
  const completionPercentage = (totalDurationOfCompletedActivities / totalSequenceDuration) * 100;
  return Math.round(completionPercentage);
}

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
}> {
  const morningActivities = await CronJobDataSource.manager.find(Activity, {
    where: { user_id, type: ActivityType.morning },
  });
  const eveningActivities = await CronJobDataSource.manager.find(Activity, {
    where: { user_id, type: ActivityType.evening },
  });
  const morningRoutineDailyDurations = calculateSequenceDurationForWeek(morningActivities);
  const eveningRoutineDailyDurations = calculateSequenceDurationForWeek(eveningActivities);
  return { morningRoutineDailyDurations, eveningRoutineDailyDurations };
}

async function recalculateDailyStatRoutineCompletions(dailyStat: DailyStats) {
  const updatedDailyStat = dailyStat;
  if (dailyStat.morning_sequence_log_id) {
    updatedDailyStat.morning_routine_completion_percentage = await calculateRoutineCompletionPercentage(
      dailyStat.user_id,
      dailyStat.morning_sequence_log_id,
    );
  }
  if (dailyStat.evening_sequence_log_id) {
    updatedDailyStat.evening_routine_completion_percentage = await calculateRoutineCompletionPercentage(
      dailyStat.user_id,
      dailyStat.evening_sequence_log_id,
    );
  }
  updatedDailyStat.should_recalculate = false;
  CronJobDataSource.manager.update(DailyStats, { id: dailyStat.id }, updatedDailyStat);
}

async function calculateOfflineActivitiesCompletionPercentage() {
  const dailyStats = await CronJobDataSource.manager.find(DailyStats, { where: { should_recalculate: true } });
  await Promise.all(dailyStats.map((dailyStat) => recalculateDailyStatRoutineCompletions(dailyStat)));
}

(async () => {
  try {
    await CronJobDataSource.initialize();
    await calculateOfflineActivitiesCompletionPercentage();
    const time24HoursAgo = DateTime.local().minus({ days: 1 }).toJSDate();
    const usersWhoseStatsAreOutOfDate = await CronJobDataSource.manager.find(User, {
      where: { last_time_stats_updated: LessThan(time24HoursAgo) },
      take: 50,
    });
    usersWhoseStatsAreOutOfDate.forEach(async (user) => {
      const userDailyStats = await CronJobDataSource.manager.find(DailyStats, {
        where: {
          user_id: user.id,
        },
        order: { date_completed: 'DESC' },
      });
      const { morningRoutineDailyDurations, eveningRoutineDailyDurations } = await getUserRoutineDailyDurations(
        user.id,
      );
      const { focus_modes_streak, morning_routines_streak, evening_routines_streak } = calculateStreaks(
        userDailyStats,
        user.timezone,
        { morningRoutineDailyDurations, eveningRoutineDailyDurations },
      );
      const userLevel = determineUserLevel(user.onboarding_progress, {
        focus_modes_streak,
        morning_routines_streak,
        evening_routines_streak,
      });
      const currentTime = DateTime.local({ zone: user.timezone }).toJSDate();
      await CronJobDataSource.manager.update(
        User,
        { id: user.id },
        {
          ...user,
          onboarding_progress: {
            ...user.onboarding_progress,
            level: userLevel,
          },
          last_time_stats_updated: currentTime,
          morning_routines_streak,
          evening_routines_streak,
          focus_modes_streak,
        },
      );
      process.exit();
    });
  } catch (error) {
    console.error('Error in user daily stats cron job:', error);
  }
})();
