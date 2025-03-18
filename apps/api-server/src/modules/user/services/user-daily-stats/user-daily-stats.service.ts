/* eslint-disable default-case */
import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { DateTime } from 'luxon';
import { Between, Equal } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import {
  BullQueues,
  BullWorkers,
  DAYS_OF_WEEK,
  ONE_MINUTE_SECONDS,
  TEN_MINUTES,
} from '../../../../shared/utils/constants';
import {
  calculateStreaks,
  getRoutinesAndFocusModesAverages,
} from '../../../../../../../cron-jobs/user-stats-cron-job/helpers';
import {
  BASE_ONBOARDING_PROGRESS,
  LEVEL_THRESHOLDS,
} from '../../../../../../../cron-jobs/user-stats-cron-job/constants';
import { CompletedActivitySequenceRepository } from '../../../activity/repositories/completed-activity-sequence.repository';
import { CompletedActivityRepository } from '../../../activity/repositories/completed-activity.repository';
import { UserProgressUpdateTypes } from '../../domain/user-progress-update-types.enum';
import { DailyStats } from '../../entities/user-daily-stats.entity';
import { DailyStatsRepository } from '../../repositories/user-daily-stats.repository';
import { UserRepository } from '../../repositories/user.repository';
import { ActivityType } from '../../../activity/domain/activity-type.enum';
import { User } from '../../entities/user.entity';
import { DeviceService } from '../../../device/services/device/device.service';
import { ActivitySequenceService } from '../../../activity/services/activity-sequence/activity-sequence.service';
import { OnboardingStatsResponseDto } from '../../dto/onboarding-stats-response.dto';
import { UserService } from '../user/user.service';
import { GetLeaderBoardQuery } from '../../dto/get-leader-board-query.dto';
import { StreakTypes } from '../../domain/StreakTypes.enum';
import { DailyStatSummary } from '../../domain/daily-stat-summary.model';
import { CompletedActivitySequence } from '../../../activity/entities/completed-activity-sequence.entity';
import { DailySequenceDurations } from '../../../activity/domain/daily-sequence-durations.model';

@Injectable()
export class UserDailyStatsService {
  constructor(
    private readonly userRepository: UserRepository,
    @InjectSentry() private readonly sentryService: SentryService,
    private readonly completedActivityRepository: CompletedActivityRepository,
    private readonly completedActivitySequenceRepository: CompletedActivitySequenceRepository,
    private readonly dailyStatsRepository: DailyStatsRepository,
    @InjectQueue(BullQueues.STATS) private statsQueue: Queue,
    @Inject(forwardRef(() => DeviceService))
    private readonly deviceService: DeviceService,
    private readonly activitySequenceService: ActivitySequenceService,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
  ) {}

  async updateUserOnboardingProgress(user_id: string, update_type: UserProgressUpdateTypes) {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Updating user onboarding progress stats',
        data: {
          user_id,
          update_type,
        },
      });
      const user = await this.userRepository.orm.findOneBy({ id: user_id });
      let { onboarding_progress } = user;
      if (onboarding_progress === null) {
        onboarding_progress = BASE_ONBOARDING_PROGRESS;
      }

      switch (update_type) {
        case UserProgressUpdateTypes.EDIT_BLOCKED_URLS:
          onboarding_progress.has_edited_always_blocked_urls = true;
          break;
        case UserProgressUpdateTypes.EDIT_SETTINGS:
          onboarding_progress.has_edited_settings = true;
          break;
        case UserProgressUpdateTypes.EDIT_FOCUS_MODE:
          onboarding_progress.has_edited_focus_mode = true;
          break;
        case UserProgressUpdateTypes.CHAT_WITH_FOCUS_BEAR:
          onboarding_progress.has_chatted_with_focus_bear = true;
          break;
      }
      await this.userRepository.orm.update(user_id, { onboarding_progress });
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async updateDistractionBlockCount(userId: string, timezone: string) {
    const startOfDate = DateTime.fromJSDate(new Date()).setZone(timezone).startOf('day').toJSDate();
    const dailyStats = await this.dailyStatsRepository.orm.findOne({
      where: { user_id: userId, date_completed: Equal(startOfDate) },
    });
    if (dailyStats) {
      await this.dailyStatsRepository.orm.save({
        ...dailyStats,
        number_of_distractions_blocked: dailyStats.number_of_distractions_blocked + 1,
      });
    } else {
      const newDailyStats = new DailyStats({
        user_id: userId,
        date_completed: startOfDate,
        number_of_distractions_blocked: 1,
        focus_modes_completed: 0,
      });
      await this.dailyStatsRepository.create(newDailyStats);
    }
  }

  async updateTimeSpentInBreaks(userId: string, date: Date, timezone: string, durationSeconds: number) {
    const startOfDate = DateTime.fromJSDate(new Date(date)).setZone(timezone).startOf('day').toJSDate();
    const dailyStats = await this.dailyStatsRepository.orm.findOne({
      where: { user_id: userId, date_completed: Equal(startOfDate) },
    });
    if (dailyStats) {
      await this.dailyStatsRepository.orm.save({
        ...dailyStats,
        seconds_spent_doing_breaks: dailyStats.seconds_spent_doing_breaks + durationSeconds,
      });
    } else {
      const newDailyStats = new DailyStats({
        user_id: userId,
        date_completed: startOfDate,
        seconds_spent_doing_breaks: durationSeconds,
        focus_modes_completed: 0,
      });
      await this.dailyStatsRepository.create(newDailyStats);
    }
  }

  async calculateRoutineCompletionPercentage(user_id: string, completed_activity_log_id: string): Promise<number> {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Checking if user completed more than half of their routine',
        data: {
          user_id,
          completed_activity_log_id,
        },
      });
      const existingRoutineLog = await this.completedActivitySequenceRepository.orm.findOne({
        where: {
          user_id,
          id: completed_activity_log_id,
        },
      });
      if (!existingRoutineLog) {
        return 0;
      }
      const activitiesFromRoutine = await this.completedActivityRepository.orm.find({
        where: { completed_sequence_id: existingRoutineLog.id },
      });
      const activitiesThatWereCompleted = activitiesFromRoutine.filter(
        (activity) => !activity.metadata?.is_skipped && !activity.metadata?.skipped_did_not_complete,
      );
      const totalOfCompletedActivities = activitiesThatWereCompleted.reduce(
        (totalSeconds, { duration_logged }) => totalSeconds + Number(duration_logged),
        0,
      );
      const sequenceDurationForCurrentDay = await this.getSequenceDurationForCurrentDay(existingRoutineLog, user_id);
      const completionPercentage =
        sequenceDurationForCurrentDay === 0
          ? 100 // If the sequence duration is 0, assume completion is 100%
          : (totalOfCompletedActivities / sequenceDurationForCurrentDay) * 100;
      return Math.round(completionPercentage);
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async getSequenceDurationForCurrentDay(routineLog: CompletedActivitySequence, userId: string) {
    const currentDayOfWeek = DateTime.fromJSDate(routineLog.start_time).weekdayShort;
    const { morningRoutineDailyDurations, eveningRoutineDailyDurations, microBreaksDailyDurations } =
      await this.activitySequenceService.getUserRoutineDailyDurations(userId);
    const sequenceType = routineLog.activity_sequence.type;
    let sequenceDurationForCurrentDay: number;
    if (sequenceType === ActivityType.morning) {
      sequenceDurationForCurrentDay = morningRoutineDailyDurations[currentDayOfWeek.toUpperCase()];
    } else if (sequenceType === ActivityType.evening) {
      sequenceDurationForCurrentDay = eveningRoutineDailyDurations[currentDayOfWeek.toUpperCase()];
    } else if (sequenceType === ActivityType.break) {
      sequenceDurationForCurrentDay = microBreaksDailyDurations[currentDayOfWeek.toUpperCase()];
    } else {
      sequenceDurationForCurrentDay = 0;
    }
    return sequenceDurationForCurrentDay;
  }

  async getUserStreaks(user: User) {
    const [userDailyStatsResponse, routineDurationsResponse] = await Promise.allSettled([
      this.dailyStatsRepository.getUserDailyStats(user.id),
      this.activitySequenceService.getUserRoutineDailyDurations(user.id),
    ]);
    const userDailyStats = (userDailyStatsResponse as PromiseFulfilledResult<DailyStats[]>).value || [];
    const routineDurations = (
      routineDurationsResponse as PromiseFulfilledResult<{
        morningRoutineDailyDurations: DailySequenceDurations;
        eveningRoutineDailyDurations: DailySequenceDurations;
        microBreaksDailyDurations: DailySequenceDurations;
      }>
    ).value;

    const { focus_modes_streak, morning_routines_streak, evening_routines_streak } = calculateStreaks(
      userDailyStats,
      user.timezone,
      routineDurations,
    );
    return { focus_modes_streak, morning_routines_streak, evening_routines_streak };
  }

  async CalculateUserStatsResponse(user_id: string): Promise<OnboardingStatsResponseDto> {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Fetching user stats and preparing response',
        data: {
          user_id,
        },
      });
      const user = await this.userRepository.orm.findOneBy({ id: user_id });
      const userDailyStats = await this.dailyStatsRepository.getUserDailyStats(user_id);
      const { morningRoutineDailyDurations, eveningRoutineDailyDurations, microBreaksDailyDurations } =
        await this.activitySequenceService.getUserRoutineDailyDurations(user_id);
      const { focus_modes_streak, morning_routines_streak, evening_routines_streak, micro_breaks_streak } =
        calculateStreaks(userDailyStats, user.timezone, {
          morningRoutineDailyDurations,
          eveningRoutineDailyDurations,
          microBreaksDailyDurations,
        });
      const { morningRoutineAverage, eveningRoutineAverage, focusModesAverage, breakRoutineAverage } =
        getRoutinesAndFocusModesAverages(userDailyStats);
      const { hasInstalledDesktopApp, hasInstalledMobileApp } = await this.deviceService.getUserInstalledDevices(
        user.id,
      );
      const {
        morning_routines_completion_percentage_for_current_level,
        evening_routines_completion_percentage_for_current_level,
        focus_modes_completion_percentage_for_current_level,
        total_percent,
        break_routines_completion_percentage_for_current_level,
      } = this.calculateCompletionPercentages(
        morning_routines_streak,
        evening_routines_streak,
        focus_modes_streak,
        micro_breaks_streak,
      );
      const {
        level,
        has_edited_focus_mode,
        has_edited_always_blocked_urls,
        has_edited_settings,
        has_chatted_with_focus_bear,
      } = this.getOnboardingStats(user);
      // replace level 0 with level 1 for existing users
      const levelToUse = level === 0 ? 1 : level;
      await this.userRepository.update(user_id, {
        morning_routines_streak,
        evening_routines_streak,
        micro_breaks_streak,
        focus_modes_streak,
        onboarding_progress: {
          ...user.onboarding_progress,
          level: levelToUse,
          has_installed_desktop_app: hasInstalledDesktopApp,
          has_installed_mobile_app: hasInstalledMobileApp,
        },
      });
      return {
        level: levelToUse,
        total_percent,
        has_edited_settings,
        has_edited_always_blocked_urls,
        has_edited_focus_mode,
        has_chatted_with_focus_bear,
        has_installed_desktop_app: hasInstalledDesktopApp,
        has_installed_mobile_app: hasInstalledMobileApp,
        morning_routine_completion_streak_days: morning_routines_streak,
        evening_routine_completion_streak_days: evening_routines_streak,
        focus_mode_completion_streak_days: focus_modes_streak,
        morning_routines_completion_percentage_for_current_level,
        evening_routines_completion_percentage_for_current_level,
        focus_modes_completion_percentage_for_current_level,
        average_morning_routines_completion_percentage: morningRoutineAverage,
        average_evening_routines_completion_percentage: eveningRoutineAverage,
        average_num_focus_modes_completed_per_day: focusModesAverage,
        routines_threshold: LEVEL_THRESHOLDS[levelToUse - 1].routines,
        focus_modes_threshold: LEVEL_THRESHOLDS[levelToUse - 1].focus_modes,
        average_break_routines_completion_percentage: breakRoutineAverage,
        break_routines_completion_percentage_for_current_level,
        break_routine_completion_streak_days: micro_breaks_streak,
      };
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async updateDailyStatsFocusModesCompleted(
    user_id: string,
    finishTime: Date,
    timeZone: string,
    durationSeconds: number,
  ) {
    try {
      const { isVerboseLoggingAllowed } = await this.userService.isVerboseLoggingAllowed(user_id);
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'User completed focus mode - updating daily stats',
        data: {
          user_id,
          finishTime,
          ...(isVerboseLoggingAllowed && { timeZone }),
        },
      });
      const startOfDate = DateTime.fromJSDate(finishTime).setZone(timeZone).startOf('day').toJSDate();
      const dailyStats = await this.dailyStatsRepository.orm.findOne({
        where: { user_id, date_completed: Equal(startOfDate) },
      });
      if (dailyStats) {
        await this.dailyStatsRepository.orm.save({
          ...dailyStats,
          focus_modes_completed: dailyStats.focus_modes_completed + 1,
          seconds_spent_in_focus_sessions: dailyStats?.seconds_spent_in_focus_sessions + durationSeconds,
        });
      } else {
        const newDailyStats = new DailyStats({
          user_id,
          date_completed: startOfDate,
          focus_modes_completed: 1,
          seconds_spent_in_focus_sessions: durationSeconds,
        });
        await this.dailyStatsRepository.create(newDailyStats);
      }
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async updateDailyStatsRoutineCompletion(
    user_id: string,
    activityType: ActivityType,
    completed_activity_log_id: string,
    startTime: Date,
    timeZone: string,
    isOffLineActivity = false,
  ) {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'User completed activity - updating daily stats',
        data: {
          user_id,
          activity_type: activityType,
          is_offline_activity: isOffLineActivity,
        },
      });
      await this.statsQueue.add(
        BullWorkers.DAILY_STATS_ACTIVITY_COMPLETED,
        {
          user_id,
          activityType,
          completed_activity_log_id,
          startTime,
          timeZone,
          isOffLineActivity,
        },
        { delay: TEN_MINUTES },
      );
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  getOnboardingStats(user: User) {
    let { onboarding_progress } = user;
    if (!onboarding_progress) {
      onboarding_progress = BASE_ONBOARDING_PROGRESS;
    }
    return { ...onboarding_progress };
  }

  calculateCompletionPercentages(
    morning_routines_streak: number,
    evening_routines_streak: number,
    focus_modes_streak: number,
    micro_breaks_streak: number,
  ) {
    const userCurrentLevelThresholds = LEVEL_THRESHOLDS[0];
    const totalRoutines = userCurrentLevelThresholds.routines;
    const totalFocusModes = userCurrentLevelThresholds.focus_modes;
    const getPercentage = (input: number, total: number) => {
      const percentage = Math.ceil((input / total) * 100);
      return percentage > 100 ? 100 : percentage;
    };
    const morningRoutinesPercentage = getPercentage(morning_routines_streak, totalRoutines);
    const eveningRoutinesPercentage = getPercentage(evening_routines_streak, totalRoutines);
    const breakRoutinesPercentage = getPercentage(micro_breaks_streak, totalRoutines);
    const focusModesPercentPercentage = getPercentage(focus_modes_streak, totalFocusModes);
    const percentages = [
      morningRoutinesPercentage,
      eveningRoutinesPercentage,
      focusModesPercentPercentage,
      breakRoutinesPercentage,
    ];
    const totalPercent = Math.ceil(percentages.reduce((total, curr) => total + curr, 0) / percentages.length);
    return {
      morning_routines_completion_percentage_for_current_level: morningRoutinesPercentage,
      evening_routines_completion_percentage_for_current_level: eveningRoutinesPercentage,
      focus_modes_completion_percentage_for_current_level: focusModesPercentPercentage,
      total_percent: totalPercent,
      break_routines_completion_percentage_for_current_level: breakRoutinesPercentage,
    };
  }

  async getLeaderBoardRankings(
    user_id: string,
    { streak_type = StreakTypes.MORNING_ROUTINES_STREAK, limit }: GetLeaderBoardQuery,
  ) {
    const users_rankings = await this.userRepository.getLeaderboardRankingsByStreakType({ streak_type, limit });
    const user_rank = await this.userRepository.getUserLeaderboardRank(user_id, streak_type);
    return { user_rank, users_rankings };
  }

  generateLastNDaysDates(days: number): Date[] {
    const dates: Date[] = [];
    for (let i = days; i >= 1; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dates.push(date);
    }
    return dates;
  }

  convertToUserTimezone(date: Date, timezone: string): Date {
    const isoDate = DateTime.fromJSDate(date).setZone(timezone).toISODate();
    return new Date(isoDate);
  }

  findDayStat(stats: DailyStats[], date: Date) {
    return stats.find((stat) => stat.date_completed.toISOString().startsWith(date.toISOString().slice(0, 10)));
  }

  getNDaysRangeForZone(zone: string, days: number) {
    const currentTime = DateTime.local().set({ hour: 23, minute: 59 }).setZone(zone);
    const end_date = currentTime.minus({ days: 1 }).endOf('day').toJSDate();
    const start_date = currentTime.minus({ days }).toJSDate();
    return { start_date, end_date };
  }

  async getLastNDaysDailyStats(user_id: string, days: number) {
    const user = await this.userRepository.orm.findOneBy({ id: user_id });
    const { start_date, end_date } = this.getNDaysRangeForZone(user.timezone, days);
    const lastNDays = this.generateLastNDaysDates(days);
    const stats = await this.dailyStatsRepository.orm.find({
      where: { user_id, date_completed: Between(start_date, end_date) },
    });
    // Adjust dates to user timezone
    for (const stat of stats) {
      stat.date_completed = this.convertToUserTimezone(stat.date_completed, user.timezone);
    }
    const { morningRoutineDailyDurations, eveningRoutineDailyDurations, microBreaksDailyDurations } =
      await this.activitySequenceService.getUserRoutineDailyDurations(user_id);
    const lastNDaysSummary = lastNDays.map((date) => {
      const dayStat = this.findDayStat(stats, date);
      const dayOfWeek = DAYS_OF_WEEK[date.getUTCDay()];
      const morningTotalMinutes = Math.round(morningRoutineDailyDurations[dayOfWeek] / ONE_MINUTE_SECONDS);
      const eveningTotalMinutes = Math.round(eveningRoutineDailyDurations[dayOfWeek] / ONE_MINUTE_SECONDS);
      const microBreaksTotalMinutes = Math.round(microBreaksDailyDurations[dayOfWeek] / ONE_MINUTE_SECONDS);
      if (dayStat) {
        const morningSeconds =
          (dayStat.morning_routine_completion_percentage / 100) * morningRoutineDailyDurations[dayOfWeek];
        const eveningSeconds =
          (dayStat.evening_routine_completion_percentage / 100) * eveningRoutineDailyDurations[dayOfWeek];
        const microBreaksSeconds =
          (dayStat.micro_breaks_routine_completion_percentage / 100) * microBreaksDailyDurations[dayOfWeek];
        return new DailyStatSummary({
          date: dayStat.date_completed,
          day_of_week: dayOfWeek,
          morning_percentage: dayStat.morning_routine_completion_percentage,
          evening_percentage: dayStat.evening_routine_completion_percentage,
          micro_breaks_completion_percentage: dayStat.micro_breaks_routine_completion_percentage,
          focus_modes: dayStat.focus_modes_completed,
          morning_minutes: morningSeconds / ONE_MINUTE_SECONDS,
          morning_total_minutes: morningTotalMinutes,
          evening_minutes: eveningSeconds / ONE_MINUTE_SECONDS,
          evening_total_minutes: eveningTotalMinutes,
          micro_breaks_minutes: microBreaksSeconds / ONE_MINUTE_SECONDS,
          micro_breaks_total_minutes: microBreaksTotalMinutes,
        });
      }
      return new DailyStatSummary({
        date,
        day_of_week: dayOfWeek,
        morning_total_minutes: morningTotalMinutes,
        evening_total_minutes: eveningTotalMinutes,
        micro_breaks_total_minutes: microBreaksTotalMinutes,
      });
    });
    return lastNDaysSummary;
  }
}
