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
      const mapActivity = ({ id, activity_data }: Activity) => ({ id, ...activity_data });
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
        const activity_ids = serializedActivities.map(({ id }) => id);
        const sequenceItem = await this.activitySequenceRepository.findOneByTypeForUser(type, user_id);
        const sequence = new ActivitySequence(
          { type, activity_ids, user_id, id: sequenceItem?.id },
          { generateId: true },
        );
        const activity_sequence_id = sequence.id;
        const createActivity = ({ id, ...activity_data }: UpdateActivityDto) =>
          new Activity({ id, activity_data, type, user_id, activity_sequence_id });
        const activities = serializedActivities.map(createActivity);
        return { sequence, activities };
      }),
    );
  }
}
