import { Injectable } from '@nestjs/common';
import { ActivityType } from '../../domain/activity-type.enum';
import { UpdateActivityDto } from '../../dto/update-activity.dto';
import { ActivitySequence } from '../../entities/activity-sequence.entity';
import { Activity } from '../../entities/activity.entity';
import { ActivitySequenceRepository } from '../../repositories/activity-sequence.repository';

export interface DeserializedActivity {
  sequence: ActivitySequence;
  activities: Activity[];
}

export interface SerializedActivity {
  morning_activities?: UpdateActivityDto[];
  evening_activities?: UpdateActivityDto[];
  break_activities?: UpdateActivityDto[];
}

@Injectable()
export class ActivityParserService {
  constructor(private readonly activitySequenceRepository: ActivitySequenceRepository) {}

  serialize(activity_sequences: ActivitySequence[]): SerializedActivity {
    const serializedActivities: SerializedActivity = {};
    for (const { type, activities, activity_ids } of activity_sequences) {
      const key = `${type}_activities`;
      const findActivity = (id): Activity => activities.find((e) => e.id === id);
      const mapActivity = ({ id, duration_seconds, log_quantity, log_summary_type, activity_data }: Activity) => ({
        id,
        duration_seconds,
        log_quantity,
        log_summary_type,
        ...activity_data,
      });
      const orderedActivities = activity_ids.map(findActivity).map(mapActivity);
      Object.assign(serializedActivities, { [key]: orderedActivities });
    }
    return serializedActivities;
  }

  async deserialize(serialized: SerializedActivity, user_id: string): Promise<DeserializedActivity[]> {
    const entries = Object.entries(serialized);
    return Promise.all(
      entries.map(async ([name, serializedActivities]) => {
        const [type] = name.split('_') as [ActivityType];
        const sequence = await this.createActivitySequence(serializedActivities, { type, user_id });
        const activity_sequence_id = sequence.id;
        const createActivity = ({
          id,
          duration_seconds,
          log_quantity,
          log_summary_type,
          ...activity_data
        }: UpdateActivityDto) =>
          new Activity({
            id,
            activity_data,
            type,
            user_id,
            activity_sequence_id,
            duration_seconds,
            log_quantity,
            log_summary_type,
          });
        const activities = serializedActivities.map(createActivity);
        return { sequence, activities };
      }),
    );
  }

  private async createActivitySequence(serializedActivities: Activity[], { type, user_id }): Promise<ActivitySequence> {
    const activity_ids = serializedActivities.map(({ id }) => id);
    const total_duration_seconds = this.calculateSequenceDuration(serializedActivities);
    const sequenceItem = await this.activitySequenceRepository.findOneByTypeForUser(type, user_id);
    const sequence = new ActivitySequence(
      { type, activity_ids, user_id, total_duration_seconds, id: sequenceItem?.id },
      { generateId: !sequenceItem?.id },
    );
    return sequence;
  }

  private calculateSequenceDuration(activities: Activity[]): number {
    const durations = activities.map(({ duration_seconds }) => Number(duration_seconds));
    const addUp = (accumulator: number, item: number): number => accumulator + item;
    const initialAccumulator = 0;
    const sequenceDuration = durations.reduce(addUp, initialAccumulator);
    return sequenceDuration;
  }
}
