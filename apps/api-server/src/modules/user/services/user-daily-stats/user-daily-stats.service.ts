/* eslint-disable default-case */
import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { DateTime } from 'luxon';
import { Equal } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { ONE_MINUTE } from '../../../../shared/utils/constants';
import {
  calculateStreaks,
  findDifferenceInSeconds,
  getRoutinesAndFocusModesAverages,
} from '../../../../../../../user-stats-cron-job/helpers';
import { BASE_ONBOARDING_PROGRESS, LEVEL_THRESHOLDS } from '../../../../../../../user-stats-cron-job/constants';
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

@Injectable()
export class UserDailyStatsService {
  constructor(
    private readonly userRepository: UserRepository,
    @InjectSentry() private readonly sentryService: SentryService,
    private readonly completedActivityRepository: CompletedActivityRepository,
    private readonly completedActivitySequenceRepository: CompletedActivitySequenceRepository,
    private readonly dailyStatsRepository: DailyStatsRepository,
    @InjectQueue('stats') private statsQueue: Queue,
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
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
      throw error;
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
        (totalSeconds, { start_time, finish_time }) => totalSeconds + findDifferenceInSeconds(start_time, finish_time),
        0,
      );
      const totalSequenceDuration = Number(existingRoutineLog.activity_sequence.sequenceDurationSeconds);
      // TODO: handle sequence duration if sequence is empty for daysOfTheWeek feature
      const completionPercentage = (totalOfCompletedActivities / totalSequenceDuration) * 100;
      return Math.round(completionPercentage);
    } catch (error) {
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
      throw error;
    }
  }

  async getUserStreaks(user: User) {
    const userDailyStats = await this.dailyStatsRepository.getUserDailyStats(user.id);
    const { morningRoutineDailyDurations, eveningRoutineDailyDurations } =
      await this.activitySequenceService.getUserRoutineDailyDurations(user.id);
    const { focus_modes_streak, morning_routines_streak, evening_routines_streak } = calculateStreaks(
      userDailyStats,
      user.timezone,
      { morningRoutineDailyDurations, eveningRoutineDailyDurations },
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
      const { morningRoutineDailyDurations, eveningRoutineDailyDurations } =
        await this.activitySequenceService.getUserRoutineDailyDurations(user_id);
      const { focus_modes_streak, morning_routines_streak, evening_routines_streak } = calculateStreaks(
        userDailyStats,
        user.timezone,
        { morningRoutineDailyDurations, eveningRoutineDailyDurations },
      );
      const { morningRoutineAverage, eveningRoutineAverage, focusModesAverage } =
        getRoutinesAndFocusModesAverages(userDailyStats);
      const { hasInstalledDesktopApp, hasInstalledMobileApp } = await this.deviceService.getUserInstalledDevices(
        user.id,
      );
      const {
        morning_routines_completion_percentage_for_current_level,
        evening_routines_completion_percentage_for_current_level,
        focus_modes_completion_percentage_for_current_level,
        total_percent,
      } = this.calculateCompletionPercentages(morning_routines_streak, evening_routines_streak, focus_modes_streak);
      const {
        level,
        has_edited_focus_mode,
        has_edited_always_blocked_urls,
        has_edited_settings,
        has_chatted_with_focus_bear,
      } = this.getOnboardingStats(user);
      // replace level 0 with leve 1 for existing users
      const levelToUse = level === 0 ? 1 : level;
      await this.userRepository.update(user_id, {
        morning_routines_streak,
        evening_routines_streak,
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
      };
    } catch (error) {
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
      throw error;
    }
  }

  async updateDailyStatsFocusModesCompleted(user_id: string, finishTime: Date, timeZone: string) {
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
        });
      } else {
        const newDailyStats = new DailyStats({ user_id, date_completed: startOfDate, focus_modes_completed: 1 });
        await this.dailyStatsRepository.create(newDailyStats);
      }
    } catch (error) {
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
      throw error;
    }
  }

  async updateDailyStatsRoutineCompletion(
    user: User,
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
          user_id: user.id,
          activity_type: activityType,
          is_offline_activity: isOffLineActivity,
        },
      });
      await this.statsQueue.add(
        'daily-stats-activity-completed',
        {
          user,
          activityType,
          completed_activity_log_id,
          startTime,
          timeZone,
          isOffLineActivity,
        },
        { delay: ONE_MINUTE },
      );
    } catch (error) {
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
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
    const focusModesPercentPercentage = getPercentage(focus_modes_streak, totalFocusModes);
    const percentages = [morningRoutinesPercentage, eveningRoutinesPercentage, focusModesPercentPercentage];
    const totalPercent = Math.ceil(percentages.reduce((total, curr) => total + curr, 0) / percentages.length);
    return {
      morning_routines_completion_percentage_for_current_level: morningRoutinesPercentage,
      evening_routines_completion_percentage_for_current_level: eveningRoutinesPercentage,
      focus_modes_completion_percentage_for_current_level: focusModesPercentPercentage,
      total_percent: totalPercent,
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
}
