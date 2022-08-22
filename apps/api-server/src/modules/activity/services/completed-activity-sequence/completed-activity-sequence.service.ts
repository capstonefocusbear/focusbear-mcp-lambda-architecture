import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { User } from '../../../user/entities/user.entity';
import { UserRepository } from '../../../user/repositories/user.repository';
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
    const { activity_ids, id } = sequence;
    const lastCompletedSequenceTime = await this.completedActivitySequenceRepository.getMostRecentCompletedTime(id);
    const completedActivities = await this.completedActivityRepository.findInSequenceAfterTime(
      id,
      lastCompletedSequenceTime,
    );
    const mappedCompletedActivities = this.mapCompletedActivitiesWithSequence(activity_ids, completedActivities);
    const metrics = await this.defineCompletedSequenceMetrics(mappedCompletedActivities, activity_ids);
    const newItem = new CompletedActivitySequence({ activity_sequence_id, user_id, ...metrics });
    return this.completedActivitySequenceRepository.create(newItem);
  }

  private mapCompletedActivitiesWithSequence(
    activity_ids: string[],
    completedActivities: CompletedActivity[],
  ): Array<CompletedActivity> {
    const result = [];
    for (const id of activity_ids) {
      const doesMatchActivityId = (e: CompletedActivity) => e?.activity_id === id;
      const item = completedActivities?.find(doesMatchActivityId);
      const index = activity_ids.indexOf(id);
      const noItemMsg = `Unable to complete sequence, no completed log for activity with id: ${id}, order: ${index}!`;
      if (!item) throw new BadRequestException(noItemMsg);
      result.push(item);
    }
    return result;
  }

  private async defineCompletedSequenceMetrics(
    mappedCompletedActivities: CompletedActivity[],
    activity_ids: string[],
  ): Promise<CompletedActivitySequenceMetrics> {
    const headItem = mappedCompletedActivities[0];
    const tailItem = mappedCompletedActivities[mappedCompletedActivities.length - 1];
    const timeRange = { start_time: headItem.finish_time, finish_time: tailItem.finish_time };
    const total_duration = await this.completedActivityRepository.getTotalDurationsPerTimeRange(
      activity_ids,
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
    const planningDailyDurationSeconds = await this.calculatePlanningDailyDuration(sequence);
    const planningDailyDurationMinutes = planningDailyDurationSeconds / 60;
    const daily_durations_minutes = await this.completedActivitySequenceRepository.getAggregatedDurationLogsPerDay(
      activity_sequence_id,
      { days_number, timezone },
    );
    const average_completion_percent = this.calculateCompletionPercent(
      daily_durations_minutes,
      planningDailyDurationMinutes,
    );
    return new CompletedActivitySequenceStats({
      days_number,
      daily_durations_minutes,
      activity_sequence_id,
      average_completion_percent,
      timezone,
    });
  }

  private async calculatePlanningDailyDuration(sequence: ActivitySequence): Promise<number> {
    const strategy = Object.freeze({
      morning: (e: ActivitySequence) => e.total_duration_seconds,
      evening: (e: ActivitySequence) => e.total_duration_seconds,
      break: (e: ActivitySequence) => this.calculatePlanningDailyBreaksDuration(e),
    });
    return strategy[sequence.type](sequence);
  }

  private async calculatePlanningDailyBreaksDuration(sequence: ActivitySequence): Promise<number> {
    const { total_duration_seconds, user_id } = sequence;
    const user = await this.userRepository.orm.findOne(user_id);
    const { startup_time, shutdown_time, break_after_minutes } = user;
    const dayDurationSeconds = this.countDayDurationSeconds(startup_time, shutdown_time);
    const breakAfterSeconds = break_after_minutes * 60;
    const breaksPerDay = this.countBreaksPerDay(breakAfterSeconds, Number(total_duration_seconds), dayDurationSeconds);
    const planningDailyBreaksDurationSeconds = breaksPerDay * total_duration_seconds;
    return planningDailyBreaksDurationSeconds;
  }

  private countDayDurationSeconds(startup_time: string, shutdown_time: string): number {
    const parseMilitaryTimeToNumber = (time: string): number => Number(time.split(':').join('.'));
    const startup = parseMilitaryTimeToNumber(startup_time);
    const shutdown = parseMilitaryTimeToNumber(shutdown_time);
    const dayDurationSeconds = (shutdown - startup) * 60 * 60;
    return dayDurationSeconds;
  }

  private countBreaksPerDay(
    breakAfterSeconds: number,
    breakDurationSeconds: number,
    dayDurationSeconds: number,
  ): number {
    const breakIterationDurationSeconds = breakAfterSeconds + breakDurationSeconds;
    const breaks = Math.floor(dayDurationSeconds / breakIterationDurationSeconds);
    return breaks;
  }

  private calculateCompletionPercent(
    dailyDurationsMinutes: CompletedActivityStatItem[],
    planningDailyDurationMinutes: number,
  ): number {
    const acceptableDeviation = 20; // based on business requirements, move that value to the config
    const countDailyCompletionPercentDeviation = ({ summary }) => (+summary / planningDailyDurationMinutes) * 100 - 100;
    const dailyCompetionPercentDeviations = dailyDurationsMinutes.map(countDailyCompletionPercentDeviation);
    const hasAcceptableDeviation = (deviation: number): boolean => Math.abs(deviation) < acceptableDeviation;
    const itemsWithAcceptableDeviation = dailyCompetionPercentDeviations.filter(hasAcceptableDeviation);
    const totalDaysWithAcceptableDeviation = itemsWithAcceptableDeviation.length;
    const totalDays = dailyDurationsMinutes.length;
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
    const currentActivityOrder = currentSequence.activity_ids.lastIndexOf(currentActivityId);
    const sequenceLength = currentSequence.activity_ids.length;
    const uncompletedActivityIds = currentSequence.activity_ids.slice(currentActivityOrder, sequenceLength);
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
