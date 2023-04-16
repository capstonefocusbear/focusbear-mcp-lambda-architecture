/* eslint-disable no-console */
import { BadRequestException, Injectable, NotAcceptableException, NotFoundException } from '@nestjs/common';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { DateTime } from 'luxon';
import { Between } from 'typeorm';
import { User } from '../../../user/entities/user.entity';
import { UserRepository } from '../../../user/repositories/user.repository';
import { ActivityType } from '../../domain/activity-type.enum';
import { CompletedActivitySequenceStats } from '../../domain/completed-activity-sequence-stats.model';
import { CompletedActivityStatItem } from '../../domain/completed-activity-stat-item.model';
import { GetCompletedActivitySequenceStatsParamsDto } from '../../dto/get-completed-activity-sequence-stats.dto';
import { GetCompletedActivityStatsQueryDto } from '../../dto/get-completed-activity-stats.dto';
import { CompletedActivitySequence } from '../../entities/completed-activity-sequence.entity';
import { ActivitySequenceRepository } from '../../repositories/activity-sequence.repository';
import { CompletedActivitySequenceRepository } from '../../repositories/completed-activity-sequence.repository';

const JEREMYS_USER_ID = '9884b0af-dc9f-4207-964e-e4db537a2234';

@Injectable()
export class CompletedActivitySequenceService {
  constructor(
    private readonly completedActivitySequenceRepository: CompletedActivitySequenceRepository,
    private readonly activitySequenceRepository: ActivitySequenceRepository,
    private readonly userRepository: UserRepository,
    @InjectSentry() private readonly sentryService: SentryService,
  ) {}

  async getOrCreateCompletingSequenceLog(user: User, activity_sequence_id: string, start_time: Date): Promise<any> {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'fetching or creating completing sequence log',
        data: {
          user_id: user.id,
          activity_sequence_id,
          start_time,
        },
      });
      const { current_activity_sequence_id, completing_sequence_log } = user;
      const hasCurrentSequence = user?.current_activity_sequence_id;
      const hasConsistentSequence = current_activity_sequence_id === completing_sequence_log?.activity_sequence_id;
      if (hasCurrentSequence && hasConsistentSequence) return completing_sequence_log;
      const newCompletingSequenceLog = new CompletedActivitySequence({
        activity_sequence_id,
        user_id: user.id,
        start_time,
        is_completed: false,
      });
      return await this.completedActivitySequenceRepository.create(newCompletingSequenceLog);
    } catch (error) {
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
      throw error;
    }
  }

  async getOrCreateCompletingSequenceLogForSyncing(user: User, activity_sequence_id: string, start_time: Date) {
    const startOfDay = DateTime.fromJSDate(new Date(start_time), { zone: 'UTC' }).startOf('day').toString();
    const endOfDay = DateTime.fromJSDate(new Date(start_time), { zone: 'UTC' }).endOf('day').toString();
    const incompleteSequence = await this.completedActivitySequenceRepository.orm.findOne({
      where: {
        user_id: user.id,
        is_completed: false,
        activity_sequence_id,
        start_time: Between(new Date(startOfDay), new Date(endOfDay)),
      },
    });
    if (incompleteSequence) {
      return incompleteSequence;
    }
    const completedSequenceFromCurrentDate = await this.completedActivitySequenceRepository.orm.findOne({
      where: {
        user_id: user.id,
        is_completed: true,
        activity_sequence_id,
        start_time: Between(new Date(startOfDay), new Date(endOfDay)),
      },
    });
    if (completedSequenceFromCurrentDate) {
      return completedSequenceFromCurrentDate;
    }
    const newCompletingSequenceLog = new CompletedActivitySequence({
      activity_sequence_id,
      user_id: user.id,
      start_time,
      is_completed: false,
    });
    return this.completedActivitySequenceRepository.create(newCompletingSequenceLog);
  }

  async completeActivitySequence(log_id: string, user_id: string): Promise<CompletedActivitySequence> {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Completing activity sequence',
        data: {
          user_id,
        },
      });
      const uncompletedSequenceLog = await this.completedActivitySequenceRepository.getUncompletedSequenceLog(log_id);
      if (!uncompletedSequenceLog) {
        throw new NotFoundException({
          message: `There is no uncompleted sequence log with id: ${log_id}`,
          donotloginslack: true,
        });
      }
      uncompletedSequenceLog.finalizeUncompletedLog();
      await this.nullifyCurrentSequenceSkippedActivities(user_id);
      return await this.completedActivitySequenceRepository.orm.save(uncompletedSequenceLog);
    } catch (error) {
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
      throw error;
    }
  }

  async completeActivitySequenceByDate(
    log_id: string,
    user_id: string,
    start_time: Date,
  ): Promise<CompletedActivitySequence> {
    try {
      const startOfDay = DateTime.fromJSDate(new Date(start_time), { zone: 'UTC' }).startOf('day').toString();
      const endOfDay = DateTime.fromJSDate(new Date(start_time), { zone: 'UTC' }).endOf('day').toString();
      const sequenceLog = await this.completedActivitySequenceRepository.getSequenceLogByDate(
        log_id,
        new Date(startOfDay),
        new Date(endOfDay),
      );
      if (!sequenceLog) return;
      sequenceLog.finalizeUncompletedLog();
      await this.nullifyCurrentSequenceSkippedActivities(user_id);
      return await this.completedActivitySequenceRepository.orm.save(sequenceLog);
    } catch (error) {
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
      throw error;
    }
  }

  async nullifyCurrentSequenceSkippedActivities(user_id: string) {
    this.sentryService.instance().addBreadcrumb({
      category: 'Service',
      level: 'debug',
      message: 'Nullifying current_sequence_skipped_activities for user',
      data: {
        user_id,
      },
    });
    await this.userRepository.update(user_id, { current_sequence_skipped_activities: null });
  }

  async getStatsByActivitySequencePerDay(
    { activity_sequence_id }: GetCompletedActivitySequenceStatsParamsDto,
    { days_number, timezone }: GetCompletedActivityStatsQueryDto,
    user_id: string,
  ): Promise<CompletedActivitySequenceStats> {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Getting stats by sequence per day',
        data: {
          user_id,
          activity_sequence_id,
          days_number,
          timezone,
        },
      });
      const sequence = await this.activitySequenceRepository.findOneByIdForUser(activity_sequence_id, user_id);
      const notFoundMessage = `Activity Sequence with id: ${activity_sequence_id} does not exist for User with id: ${user_id}!`;
      if (!sequence) {
        this.sentryService.instance().addBreadcrumb({
          category: 'Service',
          level: 'debug',
          message: 'Activity sequence not found (as part of getStatsByActivitySequencePerDay)',
          data: {
            activity_sequence_id,
          },
        });
        throw new NotFoundException(notFoundMessage);
      }
      const isBreak = sequence.type === ActivityType.break;
      if (isBreak) {
        throw new BadRequestException({
          message: 'Unable to create stats! The provided sequence is a break type.',
          donotloginslack: true,
        });
      }
      const dailyStats = await this.completedActivitySequenceRepository.getAggregatedDurationLogsPerDay(
        activity_sequence_id,
        { days_number, timezone },
      );
      const daily_durations_minutes = dailyStats.map((e) => new CompletedActivityStatItem(e));
      const average_completion_percent = this.calculateCompletionPercent(dailyStats);
      return new CompletedActivitySequenceStats({
        days_number,
        daily_durations_minutes,
        activity_sequence_id,
        average_completion_percent,
        timezone,
      });
    } catch (error) {
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
      throw error;
    }
  }

  private calculateCompletionPercent(
    dailyStats: ({
      average_duration_percent_deviation: string;
    } & CompletedActivityStatItem)[],
  ): number {
    this.sentryService.instance().addBreadcrumb({
      category: 'Service',
      level: 'debug',
      message: 'Calculating completion percentage',
    });
    const acceptableDeviation = 20; // based on business requirements, move that value to the config
    const getDailyCompletionPercentDeviation = (e) => Number(e.average_duration_percent_deviation);
    const dailyCompetionPercentDeviations = dailyStats.map(getDailyCompletionPercentDeviation);
    const hasAcceptableDeviation = (deviation: number): boolean => Math.abs(deviation) < acceptableDeviation;
    const itemsWithAcceptableDeviation = dailyCompetionPercentDeviations.filter(hasAcceptableDeviation);
    const totalDaysWithAcceptableDeviation = itemsWithAcceptableDeviation.length;
    const totalDays = dailyStats.length;
    const completionPercent = (totalDaysWithAcceptableDeviation / totalDays) * 100;
    return completionPercent;
  }

  async forceCompleteCurrentSequence(
    activity_sequence_id: string,
    user_id: string,
    cancel_habits_for_today?: boolean,
  ): Promise<any> {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Force completing current sequence',
        data: {
          activity_sequence_id,
          user_id,
          cancel_habits_for_today,
        },
      });
      const relations = ['current_activity', 'current_activity_sequence', 'completing_sequence_log'];
      const user = await this.userRepository.orm.findOne({ where: { id: user_id }, relations });
      const { hasConsistentCurrentSet } = this.validateCurrentActivitySequence(user, activity_sequence_id);
      const shouldAllowForceCompletion = await this.checkIfForceCompletionShouldBeAllowed(
        user,
        cancel_habits_for_today,
        activity_sequence_id,
      );
      if (user.id === JEREMYS_USER_ID) {
        // temp logs for debugging force completion when it shouldn't be allowed
        console.log('User properties for debugging:');
        console.log({
          user_id: user.id,
          current_activity_id: user.current_activity_id,
          current_activity_started_at: user.current_activity_assigned_at,
          current_sequence_id: user.current_activity_sequence_id,
          current_sequence_started_at: user.current_sequence_started_at,
          last_completed_sequence_id: user.last_completed_sequence_id,
          last_completed_sequence_at: user.last_completed_sequence_at,
          current_completing_sequence_log_id: user.current_completing_sequence_log_id,
        });
        console.log('Function values for debugging:');
        console.log({
          should_allow_force_completion: shouldAllowForceCompletion,
          cancel_habits_for_today,
          activity_sequence_id,
        });
      }
      if (!shouldAllowForceCompletion) {
        throw new NotAcceptableException({
          message: `Sequence with ID: ${activity_sequence_id} was started today. Include query param "cancel_habits_for_today" if you intended to clear today's sequence`,
          donotloginslack: true,
        });
      }
      hasConsistentCurrentSet ? await this.completeActivitySequence(user.completing_sequence_log.id, user.id) : null;
      const nullifiedCurrentSequence = {
        current_activity_sequence_id: null,
        current_activity_id: null,
        current_activity_assigned_at: null,
        last_completed_sequence_id: activity_sequence_id,
        last_completed_sequence_at: new Date(),
        last_completed_sequence_started_at: user.current_sequence_started_at ?? new Date(),
        current_sequence_started_at: null,
        current_completing_sequence_log_id: null,
      };
      const updatedUser = await this.userRepository.update(user_id, nullifiedCurrentSequence);
      return updatedUser;
    } catch (error) {
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
      throw error;
    }
  }

  async checkIfForceCompletionShouldBeAllowed(
    user: User,
    cancel_habits_for_today: boolean,
    activity_sequence_id: string,
  ): Promise<boolean> {
    this.sentryService.instance().addBreadcrumb({
      category: 'Service',
      level: 'debug',
      message: 'Checking if force completion should be allowed',
      data: {
        user_id: user.id,
        cancel_habits_for_today,
        activity_sequence_id,
      },
    });
    const sequence = await this.activitySequenceRepository.orm.findOneBy({ id: activity_sequence_id });
    const { type } = sequence;
    const { startup_time, shutdown_time, timezone, current_sequence_started_at } = user;
    if (!current_sequence_started_at) {
      // ?? Not sure why we return false here by default.
      // hack to fix Jeremy's morning routine
      return (user.id === JEREMYS_USER_ID);
    }
    const [startupHours, startupMins] = startup_time.split(':');
    const [shutdownHours, shutdownMins] = shutdown_time.split(':');
    const userTimeZone = timezone ?? 'UTC';
    const userCurrentTime = DateTime.local({ zone: userTimeZone });
    const userStartupTime = DateTime.local({ zone: userTimeZone }).set({
      hour: Number(startupHours),
      minute: Number(startupMins),
    });
    const userShutdownTime = DateTime.local({ zone: userTimeZone }).set({
      hour: Number(shutdownHours),
      minute: Number(shutdownMins),
    });
    const sequenceDate = DateTime.fromJSDate(current_sequence_started_at, { zone: userTimeZone });
    const sequenceWasStartedToday = sequenceDate.hasSame(DateTime.local({ zone: userTimeZone }), 'day');
    const canForceCompleteMorningRoutine = type === ActivityType.morning && userCurrentTime >= userShutdownTime;
    const canForceCompleteEveningRoutine =
      type === ActivityType.evening && userCurrentTime >= userStartupTime && userCurrentTime < userShutdownTime;
    const canForceCompleteSequence = canForceCompleteMorningRoutine || canForceCompleteEveningRoutine;
    if (user.id === JEREMYS_USER_ID) {
      console.log('Values in checkIfForceCompletionShouldBeAllowed function: ');
      console.log({
        activity_type: type,
        userStartupTime,
        userShutdownTime,
        userCurrentTime,
        sequenceDate,
        sequenceWasStartedToday,
        canForceCompleteMorningRoutine,
        canForceCompleteEveningRoutine,
        canForceCompleteSequence,
      });
    }
    if (!sequenceWasStartedToday || cancel_habits_for_today) return true;
    if (sequenceWasStartedToday && canForceCompleteSequence) return true;
    return false;
  }

  private validateCurrentActivitySequence(
    user: User,
    activity_sequence_id: string,
  ): never | { hasConsistentCurrentSet: boolean } {
    this.sentryService.instance().addBreadcrumb({
      category: 'Service',
      level: 'debug',
      message: 'Validating current activity sequence',
      data: {
        user_id: user.id,
        activity_sequence_id,
      },
    });
    const userHasCurrentSequence = Boolean(user?.current_activity_sequence_id);
    const userHasCompletingLog = Boolean(user?.completing_sequence_log);
    const hasConsistentCurrentSet = userHasCompletingLog && userHasCurrentSequence;
    const givenSequenceIsNotCurrent = user.current_activity_sequence_id !== activity_sequence_id;
    const givenSequenceIsNotCurrentMessage = `Provided sequence with id: ${activity_sequence_id} is not current!`;
    if (givenSequenceIsNotCurrent) {
      throw new BadRequestException({ message: givenSequenceIsNotCurrentMessage, donotloginslack: true });
    }
    return { hasConsistentCurrentSet };
  }
}
