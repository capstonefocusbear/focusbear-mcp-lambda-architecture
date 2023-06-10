import { Process, Processor } from '@nestjs/bull';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { Job } from 'bull';
import { DateTime } from 'luxon';
import { Equal } from 'typeorm';
import { ActivityType } from '../../activity/domain/activity-type.enum';
import { DailyStats } from '../entities/user-daily-stats.entity';
import { calculateStreaks, determineUserLevel } from '../../../../../../user-stats-cron-job/helpers';
import { DailyStatsRepository } from '../repositories/user-daily-stats.repository';
import { UserDailyStatsService } from '../services/user-daily-stats/user-daily-stats.service';
import { UserRepository } from '../repositories/user.repository';
import { User } from '../entities/user.entity';
import { ActivitySequenceService } from '../../activity/services/activity-sequence/activity-sequence.service';

@Processor('stats')
export class DailyStatsConsumer {
  constructor(
    @InjectSentry() private readonly sentryService: SentryService,
    private readonly dailyStatsRepository: DailyStatsRepository,
    private readonly userDailyStatsService: UserDailyStatsService,
    private readonly userRepository: UserRepository,
    private readonly activitySequenceService: ActivitySequenceService,
  ) {}

  @Process('daily-stats-activity-completed')
  async readOperationJob(
    job: Job<{
      user: User;
      activityType: ActivityType;
      completed_activity_log_id: string;
      startTime: Date;
      timeZone: string;
      isOffLineActivity: boolean;
    }>,
  ) {
    const {
      data: { user, timeZone, startTime, activityType, isOffLineActivity, completed_activity_log_id },
    } = job;
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Updating user daily stat record from queue',
        data: {
          user_id: user.id,
        },
      });
      const startTimeAsJSDate = new Date(startTime);
      const startOfDate = DateTime.fromJSDate(startTimeAsJSDate).setZone(timeZone).startOf('day').toJSDate();
      const dailyStats = await this.dailyStatsRepository.orm.findOne({
        where: { user_id: user.id, date_completed: Equal(startOfDate) },
      });
      const { morningRoutineDailyDurations, eveningRoutineDailyDurations } =
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
      }
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Debug values in daily stats queue',
        data: {
          startOfDate,
          dailyStats,
          routineCompletionPercentage,
        },
      });
      if (dailyStats) {
        const morningSequenceIdIfNoExisting = activityType === ActivityType.morning ? completed_activity_log_id : null;
        const eveningSequenceIdIfNoExisting = activityType === ActivityType.evening ? completed_activity_log_id : null;
        dailyStats.morning_sequence_log_id = dailyStats.morning_sequence_log_id ?? morningSequenceIdIfNoExisting;
        dailyStats.evening_sequence_log_id = dailyStats.evening_sequence_log_id ?? eveningSequenceIdIfNoExisting;
        dailyStats[routineToUpdate] = routineCompletionPercentage;
        dailyStats.should_recalculate = shouldStatsBeRecalculated;
        await this.dailyStatsRepository.orm.save(dailyStats);
      } else {
        const morning_sequence_log_id = activityType === ActivityType.morning ? completed_activity_log_id : null;
        const evening_sequence_log_id = activityType === ActivityType.evening ? completed_activity_log_id : null;
        const newDailyStats = new DailyStats({
          user_id: user.id,
          date_completed: startOfDate,
          [routineToUpdate]: routineCompletionPercentage,
          should_recalculate: shouldStatsBeRecalculated,
          morning_sequence_log_id,
          evening_sequence_log_id,
          focus_modes_completed: 0,
        });
        await this.dailyStatsRepository.create(newDailyStats);
      }
      const userDailyStats = await this.dailyStatsRepository.orm.find({
        where: {
          user_id: user.id,
        },
        order: { date_completed: 'DESC' },
      });
      const { focus_modes_streak, morning_routines_streak, evening_routines_streak } = calculateStreaks(
        userDailyStats,
        user.timezone,
        { morningRoutineDailyDurations, eveningRoutineDailyDurations },
      );
      const updatedLevel = determineUserLevel(user.onboarding_progress, {
        focus_modes_streak,
        morning_routines_streak,
        evening_routines_streak,
      });
      await this.userRepository.update(user.id, {
        onboarding_progress: { ...user.onboarding_progress, level: updatedLevel },
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.log('Error in daily stats queued job: ', error);
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
    }
  }
}
