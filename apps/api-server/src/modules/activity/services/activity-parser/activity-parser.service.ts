import { Injectable } from '@nestjs/common';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { ActivityChoiceData } from '../../domain/activity-choice-data.model';
import { ActivityData } from '../../domain/activity-data.model';
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
  standalone_activities?: UpdateActivityDto[];
}

@Injectable()
export class ActivityParserService {
  constructor(
    private readonly activitySequenceRepository: ActivitySequenceRepository,
    @InjectSentry() private readonly sentryService: SentryService,
  ) {}

  serialize(activity_sequences: Partial<ActivitySequence>[]): SerializedActivity {
    this.sentryService.instance().addBreadcrumb({
      category: 'Service',
      level: 'debug',
      message: 'Serializing activities (formatting activities to be sent to front end)',
    });
    const serializedActivities: SerializedActivity = {};
    for (const { type, activities, activity_ids } of activity_sequences) {
      let key = `${type}_activities`;
      if (type === ActivityType.break) key = 'break_activities';
      const findActivity = (id): Activity => activities.find((e) => e.id === id);
      const mapActivity = ({
        id,
        duration_seconds,
        activity_sequence_id,
        activity_template_id,
        log_quantity,
        log_summary_type,
        activity_data,
        choices,
      }: Activity) => ({
        id,
        choices: choices?.map(mapActivity),
        duration_seconds: Number(duration_seconds),
        activity_sequence_id,
        activity_template_id,
        log_quantity,
        log_summary_type,
        ...activity_data,
      });
      const orderedActivities = [...new Set(activity_ids)].map(findActivity).map(mapActivity);
      Object.assign(serializedActivities, { [key]: orderedActivities });
    }
    return serializedActivities;
  }

  async deserialize(serialized: SerializedActivity, user_id: string): Promise<DeserializedActivity[]> {
    this.sentryService.instance().addBreadcrumb({
      category: 'Service',
      level: 'debug',
      message: 'Deserializing activities (formatting activities to be saved in DB)',
      data: {
        user_id,
      },
    });
    const entries = Object.entries(serialized);
    return Promise.all(
      entries.map(async ([name, serializedActivities]) => {
        let [type] = name.split('_');
        if (type === 'break') type = ActivityType.break;
        const sequence = await this.createActivitySequence(serializedActivities, { type, user_id });
        const activity_sequence_id = sequence.id;
        const context = { type, user_id, activity_sequence_id };
        const createActivity = (e) => (activity: UpdateActivityDto) => this.createActivity(activity, e);
        const activities = serializedActivities.flatMap(createActivity(context));
        return { sequence, activities };
      }),
    );
  }

  private createActivity(
    { id, duration_seconds, log_quantity, log_summary_type, activity_template_id, choices, ...rest }: UpdateActivityDto,
    { type, user_id, activity_sequence_id },
  ): Activity[] {
    this.sentryService.instance().addBreadcrumb({
      category: 'Service',
      level: 'debug',
      message: 'Create activity',
      data: {
        activity_id: id,
      },
    });
    const has_choices = choices?.length > 0;
    const activity_data = new ActivityData(rest);
    const activity = new Activity({
      id,
      activity_data,
      type,
      user_id,
      activity_sequence_id,
      duration_seconds,
      log_quantity: has_choices ? false : log_quantity,
      log_summary_type: has_choices ? 'SUM' : log_summary_type,
      has_choices,
      activity_template_id,
    });
    const result = [activity];
    if (has_choices) result.push(...this.deserializeChoices(choices, activity));
    return result;
  }

  private deserializeChoices(choices: ActivityChoiceData[], parent: Activity): Activity[] {
    this.sentryService.instance().addBreadcrumb({
      category: 'Service',
      level: 'debug',
      message: 'Deserializing activity choices',
      data: {
        parent_id: parent.id,
      },
    });
    return choices.map(
      ({ id, log_quantity, log_summary_type, ...rest }) =>
        new Activity({
          id,
          activity_data: new ActivityData(rest),
          parent_id: parent.id,
          type: parent.type,
          user_id: parent.user_id,
          activity_sequence_id: null,
          duration_seconds: parent.duration_seconds,
          log_quantity,
          log_summary_type,
          has_choices: null,
        }),
    );
  }

  private async createActivitySequence(serializedActivities: Activity[], { type, user_id }): Promise<ActivitySequence> {
    this.sentryService.instance().addBreadcrumb({
      category: 'Service',
      level: 'debug',
      message: 'Create activity sequence',
      data: {
        user_id,
        type,
      },
    });
    const activity_ids = serializedActivities.map(({ id }) => id);
    const total_duration_seconds = this.calculateSequenceDuration(serializedActivities);
    let sequenceItem;
    /*
      If activities are of type "standalone", searching in DB for a sequence to update should be skipped.
      A new activity sequence needs to be created each time a standalone habit pack is installed
      to ensure that activities from different standalone packs aren't merged
    */
    if (type !== ActivityType.standalone) {
      sequenceItem = await this.activitySequenceRepository.findOneByTypeForUser(type, user_id);
    }
    const sequence = new ActivitySequence(
      { type, activity_ids, user_id, total_duration_seconds, id: sequenceItem?.id },
      { generateId: !sequenceItem?.id },
    );
    return sequence;
  }

  calculateSequenceDuration(activities: Activity[]): number {
    this.sentryService.instance().addBreadcrumb({
      category: 'Service',
      level: 'debug',
      message: 'Calculating sequence duration',
    });
    const durations = activities.map(({ duration_seconds }) => Number(duration_seconds));
    const addUp = (accumulator: number, item: number): number => accumulator + item;
    const initialAccumulator = 0;
    const sequenceDuration = durations.reduce(addUp, initialAccumulator);
    return sequenceDuration;
  }
}
