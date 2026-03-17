import { Process, Processor } from '@nestjs/bull';
import { InjectSentry, SentryService } from '@app/observability';
import { Job } from 'bull';
import { DateTime } from 'luxon';
import { Between } from 'typeorm';
import { ActivityType } from '../../activity/domain/activity-type.enum';
import { DailyStats } from '../entities/user-daily-stats.entity';
import { calculateStreaks, determineUserLevel } from '../../../../../../cron-jobs/user-stats-cron-job/helpers';
import { DailyStatsRepository } from '../repositories/user-daily-stats.repository';
import { UserDailyStatsService } from '../services/user-daily-stats/user-daily-stats.service';
import { UserRepository } from '../repositories/user.repository';
import { ActivitySequenceService } from '../../activity/services/activity-sequence/activity-sequence.service';
import { BullQueues, BullWorkers } from '../../../shared/utils/constants';
import { UserService } from '../services/user/user.service';

@Processor(BullQueues.STATS)
export class DailyStatsConsumer {
  constructor(
    @InjectSentry() private readonly sentryService: SentryService,
    private readonly dailyStatsRepository: DailyStatsRepository,
    private readonly userDailyStatsService: UserDailyStatsService,
    private readonly userRepository: UserRepository,
    private readonly activitySequenceService: ActivitySequenceService,
    private readonly userService: UserService,
  ) {}

  @Process(BullWorkers.DAILY_STATS_ACTIVITY_COMPLETED)
  async readOperationJob(
    job: Job<{
      user_id: string;
      activityType: ActivityType;
      completed_activity_log_id: string;
      startTime: Date;
      timeZone: string;
      isOffLineActivity: boolean;
    }>,
  ) {
    const {
      data: { user_id, timeZone, startTime, activityType, isOffLineActivity, completed_activity_log_id },
    } = job;
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Updating user daily stat record from queue',
        data: {
          user_id,
        },
      });
      const user = await this.userRepository.orm.findOne({ where: { id: user_id } });
      if (!user) return;
      const startTimeAsJSDate = new Date(startTime);
      let startTimeToUse = startTimeAsJSDate;
      const { startup_time, shutdown_time, current_sequence_started_at, last_completed_sequence_started_at } = user;
      const startUp = DateTime.fromFormat(startup_time, 'hh:mm', { zone: timeZone });
      const shutDown = DateTime.fromFormat(shutdown_time, 'hh:mm', { zone: timeZone });
      // if user shutdown is after startup on same date, use start of sequence to find daily stat record in case sequence caries over to next day
      // use last_completed_sequence_started_at in case queued job was executed after sequence completed
      if (startUp < shutDown) {
        startTimeToUse = current_sequence_started_at
          ? new Date(current_sequence_started_at)
          : new Date(last_completed_sequence_started_at);
      }
      // If user shutdown is before startup on same date, use previous date to link activities with correct day
      if (shutDown < startUp) {
        startTimeToUse = DateTime.fromJSDate(startTimeToUse).setZone(timeZone).minus({ days: 1 }).toJSDate();
      }
      const dayStart = DateTime.fromJSDate(startTimeToUse).setZone(timeZone).startOf('day').toJSDate();
      const dayEnd = DateTime.fromJSDate(startTimeToUse).setZone(timeZone).endOf('day').toJSDate();
      // biome-ignore lint/suspicious/noConsole: consumer logging
      console.log('Daily stats debug values: ', { startTime, startTimeAsJSDate, dayStart, dayEnd });
      const dailyStats = await this.dailyStatsRepository.orm.findOne({
        where: { user_id: user.id, date_completed: Between(dayStart, dayEnd) },
      });
      const { morningRoutineDailyDurations, eveningRoutineDailyDurations, microBreaksDailyDurations } =
        await this.activitySequenceService.getUserRoutineDailyDurations(user.id);
      let routineCompletionPercentage = 0;
      if (!isOffLineActivity) {
        // only calculate routine completion % for activities done online
        // when activities are completed offline the daily stats cron job will recalculate the routine completion %
        routineCompletionPercentage = await this.userDailyStatsService.calculateRoutineCompletionPercentage(
          user.id,
          completed_activity_log_id,
        );
      }
      // shouldStatsBeRecalculated value will be true when offline activities are synced
      // if the shouldStatsBeRecalculated value is true, the daily stats cron job will recalculate
      //  completion % of the routine where activities were completed offline and synced
      const shouldStatsBeRecalculated = !!isOffLineActivity;
      let routineToUpdate;
      if (activityType === ActivityType.morning) {
        routineToUpdate = 'morning_routine_completion_percentage';
      } else if (activityType === ActivityType.evening) {
        routineToUpdate = 'evening_routine_completion_percentage';
      } else if (activityType === ActivityType.break) {
        routineToUpdate = 'micro_breaks_routine_completion_percentage';
      }
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Debug values in daily stats queue',
        data: {
          dayStart,
          dayEnd,
          dailyStats,
          routineCompletionPercentage,
        },
      });
      if (dailyStats) {
        const morningSequenceIdIfNoExisting = activityType === ActivityType.morning ? completed_activity_log_id : null;
        const eveningSequenceIdIfNoExisting = activityType === ActivityType.evening ? completed_activity_log_id : null;
        const breakSequenceIdIfNoExisting = activityType === ActivityType.break ? completed_activity_log_id : null;
        dailyStats.morning_sequence_log_id = dailyStats.morning_sequence_log_id ?? morningSequenceIdIfNoExisting;
        dailyStats.evening_sequence_log_id = dailyStats.evening_sequence_log_id ?? eveningSequenceIdIfNoExisting;
        dailyStats.break_sequence_log_id = dailyStats.break_sequence_log_id ?? breakSequenceIdIfNoExisting;
        dailyStats[routineToUpdate] = routineCompletionPercentage;
        dailyStats.should_recalculate = shouldStatsBeRecalculated;
        await this.dailyStatsRepository.orm.save(dailyStats);
      } else {
        const morning_sequence_log_id = activityType === ActivityType.morning ? completed_activity_log_id : null;
        const evening_sequence_log_id = activityType === ActivityType.evening ? completed_activity_log_id : null;
        const break_sequence_log_id = activityType === ActivityType.break ? completed_activity_log_id : null;
        const newDailyStats = new DailyStats({
          user_id: user.id,
          date_completed: dayStart,
          [routineToUpdate]: routineCompletionPercentage,
          should_recalculate: shouldStatsBeRecalculated,
          morning_sequence_log_id,
          evening_sequence_log_id,
          focus_modes_completed: 0,
          break_sequence_log_id,
        });
        await this.dailyStatsRepository.create(newDailyStats);
      }

      const userDailyStats = await this.dailyStatsRepository.orm.find({
        where: {
          user_id: user.id,
        },
        order: { date_completed: 'DESC' },
      });

      const { isVerboseLoggingAllowed } = await this.userService.isVerboseLoggingAllowed(user_id);

      const {
        focus_modes_streak,
        morning_routines_streak,
        evening_routines_streak,
        micro_breaks_streak,
        percent_morning_routines_streak_complete_in_90days,
        percent_evening_routines_streak_complete_in_90days,
        percent_micro_breaks_streak_complete_in_90days,
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
      } = calculateStreaks(
        userDailyStats,
        user.timezone,
        {
          morningRoutineDailyDurations,
          eveningRoutineDailyDurations,
          microBreaksDailyDurations,
        },
        new Date(user.created_at),
      );

      // Add a breadcrumb for debugging purposes
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Updating user settings',
        ...(isVerboseLoggingAllowed && { data: { user } }),
      });

      const updatedLevel = determineUserLevel(user.onboarding_progress, {
        focus_modes_streak,
        morning_routines_streak,
        evening_routines_streak,
        micro_breaks_streak,
      });

      await this.userRepository.update(user.id, {
        onboarding_progress: { ...user.onboarding_progress, level: updatedLevel },
        morning_percent_number_day_of_stats_completed: percent_morning_routines_streak_complete_in_90days,
        evening_percent_number_day_of_stats_completed: percent_evening_routines_streak_complete_in_90days,
        micro_percent_number_day_of_stats_completed: percent_micro_breaks_streak_complete_in_90days,
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
      });

      // Log what was saved to database if verbose logging is enabled
    } catch (error) {
      // biome-ignore lint/suspicious/noConsole: consumer logging
      console.log('Error in daily stats queued job: ', error);
      this.sentryService.instance().captureException(error, { level: 'error' });
    }
  }
}
