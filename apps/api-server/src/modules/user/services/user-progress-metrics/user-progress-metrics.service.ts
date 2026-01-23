import { Injectable } from '@nestjs/common';
import { InjectSentry, SentryService } from '@app/observability';
import { DateTime } from 'luxon';
import { Between } from 'typeorm';
import { User } from '../../entities/user.entity';
import { DailyStatsRepository } from '../../repositories/user-daily-stats.repository';
import { UserStreaksService } from '../user-streaks/user-streaks.service';
import { WeeklyProgressMetricsDto } from '../../dto/weekly-progress-metrics.dto';
import { MonthlyProgressMetricsDto } from '../../dto/monthly-progress-metrics.dto';
import { DailyStats } from '../../entities/user-daily-stats.entity';
import { ActivitySequenceService } from '../../../activity/services/activity-sequence/activity-sequence.service';
import { CompletedFocusBlockRepository } from '../../../focus-mode/repositories/completed-focus-block.repository';

const DAYS_IN_WEEK = 7;

@Injectable()
export class UserProgressMetricsService {
  constructor(
    private readonly dailyStatsRepository: DailyStatsRepository,
    private readonly userStreaksService: UserStreaksService,
    private readonly activitySequenceService: ActivitySequenceService,
    private readonly completedFocusBlockRepository: CompletedFocusBlockRepository,
    @InjectSentry() private readonly sentryService: SentryService,
  ) {}

  async calculateWeeklyProgress(user: User, weekStart?: Date): Promise<WeeklyProgressMetricsDto> {
    try {
      const timezone = user.timezone || 'UTC';
      const now = DateTime.now().setZone(timezone);

      // By default, report on the previous full week so that
      // a weekly cron running at the start of the new week reflects
      // the activity that just finished.
      const base = weekStart
        ? DateTime.fromJSDate(weekStart).setZone(timezone)
        : now.minus({ weeks: 1 }).startOf('week');

      const startOfWeek = base.startOf('day');
      const endOfWeek = startOfWeek.plus({ days: 6 }).endOf('day');

      const [weeklyStats, allTimeStats, routineDurations, longestFocusBlockSeconds] = await Promise.all([
        this.dailyStatsRepository.orm.find({
          where: {
            user_id: user.id,
            date_completed: Between(startOfWeek.toJSDate(), endOfWeek.toJSDate()),
          },
        }),
        this.dailyStatsRepository.getUserDailyStats(user.id),
        this.activitySequenceService.getUserRoutineDailyDurations(user.id),
        this.completedFocusBlockRepository.getMaxFocusDurationSecondsByUserInTimeRange(user.id, {
          from_time: startOfWeek.toJSDate(),
          to_time: endOfWeek.toJSDate(),
        }),
      ]);

      const streaks = this.userStreaksService.calculateStreaksForUser(
        allTimeStats,
        user.timezone,
        routineDurations,
        new Date(user.created_at),
      );

      const routineMetrics = this.aggregateRoutineMetrics(weeklyStats, streaks, DAYS_IN_WEEK);
      const focusMetrics = this.aggregateFocusMetrics(
        weeklyStats,
        streaks,
        longestFocusBlockSeconds > 0 ? longestFocusBlockSeconds / 60 : undefined,
      );
      const taskMetrics = this.aggregateTaskMetrics(weeklyStats);

      return {
        week_start: startOfWeek.toJSDate(),
        week_end: endOfWeek.toJSDate(),
        routines: routineMetrics,
        focus_sessions: focusMetrics,
        tasks: taskMetrics,
        streaks: {
          current_overall: streaks.focus_modes_streak,
          best_overall: Math.max(
            streaks.focus_modes_streak,
            streaks.morning_routines_streak,
            streaks.evening_routines_streak,
          ),
          morning_routine: streaks.morning_routines_streak,
          evening_routine: streaks.evening_routines_streak,
          focus_mode: streaks.focus_modes_streak,
        },
      };
    } catch (error) {
      this.sentryService.instance().captureException(error, {
        extra: { userId: user.id, operation: 'calculateWeeklyProgress' },
      });
      throw error;
    }
  }

  async calculateDailyProgress(user: User): Promise<WeeklyProgressMetricsDto> {
    try {
      const timezone = user.timezone || 'UTC';
      const targetDay = DateTime.now().setZone(timezone).minus({ days: 1 });
      const dayStart = targetDay.startOf('day');
      const dayEnd = targetDay.endOf('day');

      const [dailyStats, allTimeStats, routineDurations, longestFocusBlockSeconds] = await Promise.all([
        this.dailyStatsRepository.orm.find({
          where: {
            user_id: user.id,
            date_completed: Between(dayStart.toJSDate(), dayEnd.toJSDate()),
          },
        }),
        this.dailyStatsRepository.getUserDailyStats(user.id),
        this.activitySequenceService.getUserRoutineDailyDurations(user.id),
        this.completedFocusBlockRepository.getMaxFocusDurationSecondsByUserInTimeRange(user.id, {
          from_time: dayStart.toJSDate(),
          to_time: dayEnd.toJSDate(),
        }),
      ]);
      const streaks = this.userStreaksService.calculateStreaksForUser(
        allTimeStats,
        user.timezone,
        routineDurations,
        new Date(user.created_at),
      );

      const routineMetrics = this.aggregateRoutineMetrics(dailyStats, streaks, 1);
      const focusMetrics = this.aggregateFocusMetrics(
        dailyStats,
        streaks,
        longestFocusBlockSeconds > 0 ? longestFocusBlockSeconds / 60 : undefined,
      );
      const taskMetrics = this.aggregateTaskMetrics(dailyStats);

      return {
        week_start: dayStart.toJSDate(),
        week_end: dayEnd.toJSDate(),
        routines: routineMetrics,
        focus_sessions: focusMetrics,
        tasks: taskMetrics,
        streaks: {
          current_overall: streaks.focus_modes_streak,
          best_overall: Math.max(
            streaks.focus_modes_streak,
            streaks.morning_routines_streak,
            streaks.evening_routines_streak,
          ),
          morning_routine: streaks.morning_routines_streak,
          evening_routine: streaks.evening_routines_streak,
          focus_mode: streaks.focus_modes_streak,
        },
      };
    } catch (error) {
      this.sentryService.instance().captureException(error, {
        extra: { userId: user.id, operation: 'calculateDailyProgress' },
      });
      throw error;
    }
  }

  async calculateMonthlyProgress(user: User, monthStart?: Date): Promise<MonthlyProgressMetricsDto> {
    try {
      const timezone = user.timezone || 'UTC';
      const now = DateTime.now().setZone(timezone);
      const startOfMonth = (
        monthStart ? DateTime.fromJSDate(monthStart).setZone(timezone) : now.startOf('month')
      ).startOf('day');
      const endOfMonth = startOfMonth.endOf('month');

      const [monthlyStats, allTimeStats, routineDurations, longestFocusBlockSeconds] = await Promise.all([
        this.dailyStatsRepository.orm.find({
          where: {
            user_id: user.id,
            date_completed: Between(startOfMonth.toJSDate(), endOfMonth.toJSDate()),
          },
        }),
        this.dailyStatsRepository.getUserDailyStats(user.id),
        this.activitySequenceService.getUserRoutineDailyDurations(user.id),
        this.completedFocusBlockRepository.getMaxFocusDurationSecondsByUserInTimeRange(user.id, {
          from_time: startOfMonth.toJSDate(),
          to_time: endOfMonth.toJSDate(),
        }),
      ]);
      const streaks = this.userStreaksService.calculateStreaksForUser(
        allTimeStats,
        user.timezone,
        routineDurations,
        new Date(user.created_at),
      );

      // Calculate days in the actual month for more accurate metrics
      const daysInMonth = endOfMonth.day;

      const routineMetrics = this.aggregateMonthlyRoutineMetrics(monthlyStats, streaks, daysInMonth);
      const focusMetrics = this.aggregateMonthlyFocusMetrics(
        monthlyStats,
        streaks,
        longestFocusBlockSeconds > 0 ? longestFocusBlockSeconds / 60 : undefined,
      );
      const taskMetrics = this.aggregateMonthlyTaskMetrics(monthlyStats);

      return {
        month_start: startOfMonth.toJSDate(),
        month_end: endOfMonth.toJSDate(),
        routines: routineMetrics,
        focus_sessions: focusMetrics,
        tasks: taskMetrics,
        streaks: {
          current_overall: streaks.focus_modes_streak,
          best_overall: Math.max(
            streaks.focus_modes_streak,
            streaks.morning_routines_streak,
            streaks.evening_routines_streak,
          ),
          morning_routine: streaks.morning_routines_streak,
          evening_routine: streaks.evening_routines_streak,
          focus_mode: streaks.focus_modes_streak,
        },
      };
    } catch (error) {
      this.sentryService.instance().captureException(error, {
        extra: { userId: user.id, operation: 'calculateMonthlyProgress' },
      });
      throw error;
    }
  }

  private aggregateRoutineMetrics(weeklyStats: DailyStats[], streaks: any, totalDays = DAYS_IN_WEEK) {
    const morningRoutinesCompleted = weeklyStats.filter((s) => s.morning_routine_completion_percentage > 0).length;
    const eveningRoutinesCompleted = weeklyStats.filter((s) => s.evening_routine_completion_percentage > 0).length;
    const microBreaksCompleted = weeklyStats.reduce((sum, s) => sum + (s.seconds_spent_doing_breaks > 0 ? 1 : 0), 0);

    return {
      morning: {
        completed: morningRoutinesCompleted,
        total: totalDays,
        streak: streaks.morning_routines_streak,
      },
      evening: {
        completed: eveningRoutinesCompleted,
        total: totalDays,
        streak: streaks.evening_routines_streak,
      },
      micro_breaks: {
        completed: microBreaksCompleted,
        total: totalDays,
        streak: streaks.micro_breaks_streak,
      },
    };
  }

  private aggregateFocusMetrics(weeklyStats: DailyStats[], streaks: any, longestFocusSessionMinutes?: number) {
    const totalMinutes = weeklyStats.reduce((sum, s) => sum + (s.seconds_spent_in_focus_sessions || 0), 0) / 60; // Convert seconds to minutes

    const sessionsCount = weeklyStats.reduce((sum, s) => sum + (s.focus_modes_completed || 0), 0);

    const longestSession =
      longestFocusSessionMinutes !== undefined
        ? longestFocusSessionMinutes
        : Math.max(...weeklyStats.map((s) => (s.seconds_spent_in_focus_sessions || 0) / 60), 0);

    return {
      total_minutes: Math.round(totalMinutes),
      sessions_count: sessionsCount,
      longest_session: Math.round(longestSession),
      streak: streaks.focus_modes_streak,
    };
  }

  private aggregateTaskMetrics(weeklyStats: DailyStats[]) {
    // Note: Task metrics would need to be added to DailyStats entity
    // For now, using placeholder logic based on existing fields
    const completed = weeklyStats.reduce(
      (sum, s) => sum + (s.focus_modes_completed || 0), // Approximation
      0,
    );

    // Assuming a task completion rate based on activity
    const completionRate = weeklyStats.length > 0 ? completed / weeklyStats.length : 0;

    return {
      completed,
      created: Math.round(completed / Math.max(completionRate, 0.1)),
      completion_rate: Math.min(completionRate, 1),
    };
  }

  private aggregateMonthlyRoutineMetrics(monthlyStats: DailyStats[], streaks: any, daysInMonth: number) {
    const morningRoutinesCompleted = monthlyStats.filter((s) => s.morning_routine_completion_percentage > 0).length;
    const eveningRoutinesCompleted = monthlyStats.filter((s) => s.evening_routine_completion_percentage > 0).length;
    const microBreaksCompleted = monthlyStats.reduce((sum, s) => sum + (s.seconds_spent_doing_breaks > 0 ? 1 : 0), 0);

    return {
      morning: {
        completed: morningRoutinesCompleted,
        total: daysInMonth,
        streak: streaks.morning_routines_streak,
      },
      evening: {
        completed: eveningRoutinesCompleted,
        total: daysInMonth,
        streak: streaks.evening_routines_streak,
      },
      micro_breaks: {
        completed: microBreaksCompleted,
        total: daysInMonth,
        streak: streaks.micro_breaks_streak,
      },
    };
  }

  private aggregateMonthlyFocusMetrics(monthlyStats: DailyStats[], streaks: any, longestFocusSessionMinutes?: number) {
    const totalMinutes = monthlyStats.reduce((sum, s) => sum + (s.seconds_spent_in_focus_sessions || 0), 0) / 60; // Convert seconds to minutes

    const sessionsCount = monthlyStats.reduce((sum, s) => sum + (s.focus_modes_completed || 0), 0);

    const longestSession =
      longestFocusSessionMinutes !== undefined
        ? longestFocusSessionMinutes
        : Math.max(...monthlyStats.map((s) => (s.seconds_spent_in_focus_sessions || 0) / 60), 0);

    return {
      total_minutes: Math.round(totalMinutes),
      sessions_count: sessionsCount,
      longest_session: Math.round(longestSession),
      streak: streaks.focus_modes_streak,
    };
  }

  private aggregateMonthlyTaskMetrics(monthlyStats: DailyStats[]) {
    // Note: Task metrics would need to be added to DailyStats entity
    // For now, using placeholder logic based on existing fields
    const completed = monthlyStats.reduce(
      (sum, s) => sum + (s.focus_modes_completed || 0), // Approximation
      0,
    );

    // Assuming a task completion rate based on activity
    const completionRate = monthlyStats.length > 0 ? completed / monthlyStats.length : 0;

    return {
      completed,
      created: Math.round(completed / Math.max(completionRate, 0.1)),
      completion_rate: Math.min(completionRate, 1),
    };
  }
}
