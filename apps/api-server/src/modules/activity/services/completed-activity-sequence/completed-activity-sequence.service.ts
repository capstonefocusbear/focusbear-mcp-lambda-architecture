import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DateTime } from 'luxon';
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

@Injectable()
export class CompletedActivitySequenceService {
  constructor(
    private readonly completedActivitySequenceRepository: CompletedActivitySequenceRepository,
    private readonly activitySequenceRepository: ActivitySequenceRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async getOrCreateCompletingSequenceLog(user: User, activity_sequence_id: string, start_time: Date): Promise<any> {
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
    return this.completedActivitySequenceRepository.create(newCompletingSequenceLog);
  }

  async completeActivitySequence(log_id: string, user_id: string): Promise<CompletedActivitySequence> {
    const uncompletedSequenceLog = await this.completedActivitySequenceRepository.getUncompletedSequenceLog(log_id);
    if (!uncompletedSequenceLog) throw new NotFoundException(`There is no uncompleted sequence log with id: ${log_id}`);
    uncompletedSequenceLog.finalizeUncompletedLog();
    await this.nullifyCurrentSequenceSkippedActivities(user_id);
    return this.completedActivitySequenceRepository.orm.save(uncompletedSequenceLog);
  }

  async nullifyCurrentSequenceSkippedActivities(user_id: string) {
    await this.userRepository.update(user_id, { current_sequence_skipped_activities: null });
  }

  async getStatsByActivitySequencePerDay(
    { activity_sequence_id }: GetCompletedActivitySequenceStatsParamsDto,
    { days_number, timezone }: GetCompletedActivityStatsQueryDto,
    user_id: string,
  ): Promise<CompletedActivitySequenceStats> {
    const sequence = await this.activitySequenceRepository.findOneByIdForUser(activity_sequence_id, user_id);
    const notFoundMessage = `Activity Sequence with id: ${activity_sequence_id} does not exist for User with id: ${user_id}!`;
    if (!sequence) throw new NotFoundException(notFoundMessage);
    const isBreak = sequence.type === ActivityType.break;
    if (isBreak) throw new BadRequestException('Unable to create stats! The provided sequence is a break type.');
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
  }

  private calculateCompletionPercent(
    dailyStats: ({
      average_duration_percent_deviation: string;
    } & CompletedActivityStatItem)[],
  ): number {
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
    const relations = ['current_activity', 'current_activity_sequence', 'completing_sequence_log'];
    const user = await this.userRepository.orm.findOne({ where: { id: user_id }, relations });
    const { hasConsistentCurrentSet } = this.validateCurrentActivitySequence(user, activity_sequence_id);
    const sequenceStartTime = user.current_sequence_started_at;
    const sequenceDate = sequenceStartTime && DateTime.fromJSDate(sequenceStartTime);
    const sequenceWasStartedToday = sequenceDate && sequenceDate.hasSame(DateTime.local(), 'day');
    if (!cancel_habits_for_today && sequenceWasStartedToday) {
      return `Sequence with ID: ${activity_sequence_id} was started today. Include query param "cancel_habits_for_today" if you intended to clear today's sequence`;
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
  }

  private validateCurrentActivitySequence(
    user: User,
    activity_sequence_id: string,
  ): never | { hasConsistentCurrentSet: boolean } {
    const userHasCurrentSequence = Boolean(user?.current_activity_sequence_id);
    const userHasCompletingLog = Boolean(user?.completing_sequence_log);
    const hasConsistentCurrentSet = userHasCompletingLog && userHasCurrentSequence;
    const givenSequenceIsNotCurrent = user.current_activity_sequence_id !== activity_sequence_id;
    const hasWrongCurrentSequence = userHasCurrentSequence && givenSequenceIsNotCurrent;
    const givenSequenceIsNotCurrentMessage = `Provided sequence with id: ${activity_sequence_id} is not current!`;
    if (hasWrongCurrentSequence) throw new BadRequestException(givenSequenceIsNotCurrentMessage);
    return { hasConsistentCurrentSet };
  }
}
