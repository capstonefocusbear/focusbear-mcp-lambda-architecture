import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { User } from '../../../user/entities/user.entity';
import { UserRepository } from '../../../user/repositories/user.repository';
import { ActivityType } from '../../domain/activity-type.enum';
import { CompletedActivitySequenceMetrics } from '../../domain/completed-activity-sequence-metrics.interface';
import { CompletedActivitySequenceStats } from '../../domain/completed-activity-sequence-stats.model';
import { CompletedActivityStatItem } from '../../domain/completed-activity-stat-item.model';
import { GetCompletedActivitySequenceStatsParamsDto } from '../../dto/get-completed-activity-sequence-stats.dto';
import { GetCompletedActivityStatsQueryDto } from '../../dto/get-completed-activity-stats.dto';
import { ActivitySequence } from '../../entities/activity-sequence.entity';
import { CompletedActivitySequence } from '../../entities/completed-activity-sequence.entity';
import { CompletedActivity } from '../../entities/completed-activity.entity';
import { ActivitySequenceRepository } from '../../repositories/activity-sequence.repository';
import { CompletedActivitySequenceRepository } from '../../repositories/completed-activity-sequence.repository';
import { CompletedActivityRepository } from '../../repositories/completed-activity.repository';

@Injectable()
export class CompletedActivitySequenceService {
  constructor(
    private readonly completedActivitySequenceRepository: CompletedActivitySequenceRepository,
    private readonly completedActivityRepository: CompletedActivityRepository,
    private readonly activitySequenceRepository: ActivitySequenceRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async completeActivitySequence(activity_sequence_id: string, user_id: string): Promise<CompletedActivitySequence> {
    const sequence = await this.activitySequenceRepository.orm.findOne(activity_sequence_id);
    if (!sequence) throw new NotFoundException(`Activity Sequence with id: ${activity_sequence_id} does not exist!`);
    const { sequenceActivityIds, id } = sequence;
    const lastCompletedSequenceTime = await this.completedActivitySequenceRepository.getMostRecentCompletedTime(id);
    const completedActivities = await this.completedActivityRepository.findInSequenceAfterTime(
      id,
      lastCompletedSequenceTime,
    );
    const mappedCompletedActivities = this.mapCompletedActivitiesWithSequence(sequenceActivityIds, completedActivities);
    const metrics = await this.defineCompletedSequenceMetrics(mappedCompletedActivities, sequenceActivityIds);
    const plan_duration_minutes = sequence.sequenceDurationMinutes;
    const newItem = new CompletedActivitySequence({ activity_sequence_id, plan_duration_minutes, user_id, ...metrics });
    sequence.resetFlexSequence();
    await this.activitySequenceRepository.orm.save(sequence);
    return this.completedActivitySequenceRepository.create(newItem);
  }

  private mapCompletedActivitiesWithSequence(
    sequenceActivityIds: string[],
    completedActivities: CompletedActivity[],
  ): Array<CompletedActivity> {
    const result = [];
    for (const id of sequenceActivityIds) {
      const doesMatchActivityId = (e: CompletedActivity) => e?.activity_id === id;
      const item = completedActivities?.find(doesMatchActivityId);
      const index = sequenceActivityIds.indexOf(id);
      const noItemMsg = `Unable to complete sequence, no completed log for activity with id: ${id}, order: ${index}!`;
      if (!item) throw new BadRequestException(noItemMsg);
      result.push(item);
    }
    return result;
  }

  private async defineCompletedSequenceMetrics(
    mappedCompletedActivities: CompletedActivity[],
    sequenceActivityIds: string[],
  ): Promise<CompletedActivitySequenceMetrics> {
    const headItem = mappedCompletedActivities[0];
    const tailItem = mappedCompletedActivities[mappedCompletedActivities.length - 1];
    const timeRange = { start_time: headItem.finish_time, finish_time: tailItem.finish_time };
    const total_duration = await this.completedActivityRepository.getTotalDurationsPerTimeRange(
      sequenceActivityIds,
      timeRange,
    );
    const duration_minutes = total_duration ? Number(total_duration) / 60 : 0;
    return {
      start_time: headItem.start_time,
      finish_time: tailItem.finish_time,
      duration_minutes,
    };
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

  async forceCompleteCurrentSequence(activity_sequence_id: string, user_id: string): Promise<any> {
    const getUserOptions = { relations: ['current_activity', 'current_activity_sequence'] };
    const user = await this.userRepository.orm.findOne(user_id, getUserOptions);
    this.validateCurrentActivitySequence(user, activity_sequence_id);
    const currentActivityId = user.current_activity_id;
    const uncompletedActivityIds = this.defineUncompletedActivitiesInTheSequence(
      user.current_activity_sequence,
      currentActivityId,
    );
    const emptyCompletedActivityLogs = this.createEmptyCompletedActivityLogs(user, uncompletedActivityIds);
    await Promise.all(emptyCompletedActivityLogs.map((e) => this.completedActivityRepository.orm.save(e)));
    await this.completeActivitySequence(activity_sequence_id, user_id);
    const nullifiedCurrentSequence = {
      current_activity_sequence_id: null,
      current_activity_id: null,
      current_activity_assigned_at: null,
      last_completed_sequence_id: activity_sequence_id,
      last_completed_sequence_at: new Date(),
      last_completed_sequence_started_at: user.current_sequence_started_at,
      current_sequence_started_at: null,
    };
    const updatedUser = await this.userRepository.update(user_id, nullifiedCurrentSequence);
    return updatedUser;
  }

  private validateCurrentActivitySequence(user: User, activity_sequence_id: string): never | void {
    const userHasNoCurrentSequence = !user.current_activity_sequence_id;
    const givenSequenceIsNotCurren = user.current_activity_sequence_id !== activity_sequence_id;
    const userHasNoCurrentSequenceMessage = 'This User has no current activity sequence specified!';
    if (userHasNoCurrentSequence) throw new BadRequestException(userHasNoCurrentSequenceMessage);
    const givenSequenceIsNotCurrenMessage = `Provided sequence with id: ${activity_sequence_id} is not current!`;
    if (givenSequenceIsNotCurren) throw new BadRequestException(givenSequenceIsNotCurrenMessage);
  }

  private defineUncompletedActivitiesInTheSequence(
    currentSequence: ActivitySequence,
    currentActivityId: string,
  ): string[] {
    const currentActivityOrder = currentSequence.sequenceActivityIds.lastIndexOf(currentActivityId);
    const sequenceLength = currentSequence.sequenceActivityIds.length;
    const uncompletedActivityIds = currentSequence.sequenceActivityIds.slice(currentActivityOrder, sequenceLength);
    return uncompletedActivityIds;
  }

  private createEmptyCompletedActivityLogs(user: User, uncompletedActivityIds: string[]): CompletedActivity[] {
    return uncompletedActivityIds.map(
      (id: string): CompletedActivity =>
        new CompletedActivity({
          activity_sequence_id: user.current_activity_sequence_id,
          activity_id: id,
          user_id: user.id,
          start_time: user.current_activity_assigned_at,
          finish_time: user.current_activity_assigned_at,
          duration_logged: 0,
        }),
    );
  }
}
