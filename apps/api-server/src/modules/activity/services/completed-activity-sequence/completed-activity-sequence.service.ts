import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CompletedActivitySequenceMetrics } from '../../domain/completed-activity-sequence-metrics.interface';
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
}
