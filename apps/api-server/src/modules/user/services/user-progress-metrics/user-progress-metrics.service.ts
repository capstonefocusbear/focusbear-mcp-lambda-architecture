import { Injectable } from '@nestjs/common';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { DateTime } from 'luxon';
import { Between } from 'typeorm';
import { User } from '../../entities/user.entity';
import { DailyStatsRepository } from '../../repositories/user-daily-stats.repository';
import { UserStreaksService } from '../user-streaks/user-streaks.service';
import { WeeklyProgressMetricsDto } from '../../dto/weekly-progress-metrics.dto';
import { MonthlyProgressMetricsDto } from '../../dto/monthly-progress-metrics.dto';
import { DailyStats } from '../../entities/user-daily-stats.entity';
import { ActivitySequenceService } from '../../../activity/services/activity-sequence/activity-sequence.service';

const DAYS_IN_WEEK = 7;

@Injectable()
export class UserProgressMetricsService {
  constructor(
    private readonly dailyStatsRepository: DailyStatsRepository,
    private readonly userStreaksService: UserStreaksService,
    private readonly activitySequenceService: ActivitySequenceService,
    @InjectSentry() private readonly sentryService: SentryService,
  ) {}

  async calculateWeeklyProgress(user: User, weekStart?: Date): Promise<WeeklyProgressMetricsDto> {
    try {
      const timezone = user.timezone || 'UTC';
      const now = DateTime.now().setZone(timezone);
      const startOfWeek = (weekStart ? DateTime.fromJSDate(weekStart).setZone(timezone) : now.startOf('week')).startOf(
        'day',
      );

      // If weekStart is provided (e.g., daily emails for a rolling 7-day window), cap at a 7-day range.
      const endOfWeek = weekStart ? startOfWeek.plus({ days: 6 }).endOf('day') : startOfWeek.endOf('week');

      const weeklyStats = await this.dailyStatsRepository.orm.find({
        where: {
          user_id: user.id,
          date_completed: Between(startOfWeek.toJSDate(), endOfWeek.toJSDate()),
        },
      });

      const allTimeStats = await this.dailyStatsRepository.getUserDailyStats(user.id);

      // Get routine durations for streak calculations
      const routineDurations = await this.activitySequenceService.getUserRoutineDailyDurations(user.id);

      const streaks = this.userStreaksService.calculateStreaksForUser(
        allTimeStats,
        user.timezone,
        routineDurations,
        new Date(user.created_at),
      );

      const routineMetrics = this.aggregateRoutineMetrics(weeklyStats, streaks);
      const focusMetrics = this.aggregateFocusMetrics(weeklyStats, streaks);
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

  async calculateMonthlyProgress(user: User, monthStart?: Date): Promise<MonthlyProgressMetricsDto> {
    try {
      const timezone = user.timezone || 'UTC';
      const now = DateTime.now().setZone(timezone);
      const startOfMonth = (
        monthStart ? DateTime.fromJSDate(monthStart).setZone(timezone) : now.startOf('month')
      ).startOf('day');
      const endOfMonth = startOfMonth.endOf('month');

      // Get daily stats for the month - using efficient query with date range
      const monthlyStats = await this.dailyStatsRepository.orm.find({
        where: {
          user_id: user.id,
          date_completed: Between(startOfMonth.toJSDate(), endOfMonth.toJSDate()),
        },
      });

      // Only fetch all-time stats if we have monthly data to avoid unnecessary memory usage
      let streaks = {
        morning_routines_streak: 0,
        evening_routines_streak: 0,
        focus_modes_streak: 0,
        micro_breaks_streak: 0,
      };
      if (monthlyStats.length > 0) {
        const allTimeStats = await this.dailyStatsRepository.getUserDailyStats(user.id);
        const routineDurations = await this.activitySequenceService.getUserRoutineDailyDurations(user.id);

        streaks = this.userStreaksService.calculateStreaksForUser(
          allTimeStats,
          user.timezone,
          routineDurations,
          new Date(user.created_at),
        );
      }

      // Calculate days in the actual month for more accurate metrics
      const daysInMonth = endOfMonth.day;

      const routineMetrics = this.aggregateMonthlyRoutineMetrics(monthlyStats, streaks, daysInMonth);
      const focusMetrics = this.aggregateMonthlyFocusMetrics(monthlyStats, streaks);
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

  private aggregateRoutineMetrics(weeklyStats: DailyStats[], streaks: any) {
    const morningRoutinesCompleted = weeklyStats.filter((s) => s.morning_routine_completion_percentage > 0).length;
    const eveningRoutinesCompleted = weeklyStats.filter((s) => s.evening_routine_completion_percentage > 0).length;
    const microBreaksCompleted = weeklyStats.reduce((sum, s) => sum + (s.seconds_spent_doing_breaks > 0 ? 1 : 0), 0);

    return {
      morning: {
        completed: morningRoutinesCompleted,
        total: DAYS_IN_WEEK,
        streak: streaks.morning_routines_streak,
      },
      evening: {
        completed: eveningRoutinesCompleted,
        total: DAYS_IN_WEEK,
        streak: streaks.evening_routines_streak,
      },
      micro_breaks: {
        completed: microBreaksCompleted,
        total: DAYS_IN_WEEK,
        streak: streaks.micro_breaks_streak,
      },
    };
  }

  private aggregateFocusMetrics(weeklyStats: DailyStats[], streaks: any) {
    const totalMinutes = weeklyStats.reduce((sum, s) => sum + (s.seconds_spent_in_focus_sessions || 0), 0) / 60; // Convert seconds to minutes

    const sessionsCount = weeklyStats.reduce((sum, s) => sum + (s.focus_modes_completed || 0), 0);

    // Calculate longest session from daily stats (assuming we have this data)
    const longestSession = Math.max(...weeklyStats.map((s) => (s.seconds_spent_in_focus_sessions || 0) / 60), 0);

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

  private aggregateMonthlyFocusMetrics(monthlyStats: DailyStats[], streaks: any) {
    const totalMinutes = monthlyStats.reduce((sum, s) => sum + (s.seconds_spent_in_focus_sessions || 0), 0) / 60; // Convert seconds to minutes

    const sessionsCount = monthlyStats.reduce((sum, s) => sum + (s.focus_modes_completed || 0), 0);

    // Calculate longest session from daily stats (assuming we have this data)
    const longestSession = Math.max(...monthlyStats.map((s) => (s.seconds_spent_in_focus_sessions || 0) / 60), 0);

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
