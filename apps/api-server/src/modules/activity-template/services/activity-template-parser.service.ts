import { Injectable } from '@nestjs/common';
import { ActivityChoiceData } from '../../activity/domain/activity-choice-data.model';
import { ActivityData } from '../../activity/domain/activity-data.model';
import { ActivityType } from '../../activity/domain/activity-type.enum';
import { HabitPackType } from '../../habit-pack/domain/habit-pack-type.enum';
import { UpdateActivityTemplateDto } from '../dto/activity-template.dto';
import { ActivityTemplate } from '../entity/activity-template.entity';
import { ActivityTemplateRepository } from '../repository/activity-template.repository';

export interface SerializedActivityTemplates {
  morning_activities?: UpdateActivityTemplateDto[];
  evening_activities?: UpdateActivityTemplateDto[];
  break_activities?: UpdateActivityTemplateDto[];
  standalone_activities?: UpdateActivityTemplateDto[];
}

@Injectable()
export class ActivityTemplateParserService {
  constructor(private readonly activityTemplateRepository: ActivityTemplateRepository) {}

  /*
  Returns an array that has an array of standalone activities. nested array format needed for consistentlyUpdateHabitPack function
  in habit-pack.service.ts
  activityType is split from "standalone_activity" to "standalone" and is used to insert the type for activities and their choices
  */
  async deserializeStandaloneActivities(
    serialized: SerializedActivityTemplates,
    user_id: string,
    pack_id: string,
  ): Promise<ActivityTemplate[]> {
    const entries = Object.entries(serialized);
    return entries.map(([activityType, deserializedActivities]) => {
      const [activity_type] = activityType.split('_');
      return deserializedActivities.flatMap((deserializedActivity) => {
        return this.createActivityTemplate(deserializedActivity, { activity_type, user_id, pack_id });
      });
    });
  }

  /*
  Returns an array that contains three arrays of ActivityTemplate objects, one for each activity type: morning, break, and evening.
  activityType is split and used to insert the type for activities and their choices. Example: "morning_activites" -> "morning"
  */
  async deserializeRoutineActivities(
    serialized: SerializedActivityTemplates,
    user_id: string,
    pack_id: string,
  ): Promise<ActivityTemplate[]> {
    const entries = Object.entries(serialized);
    return entries.map(([activityType, deserializedActivities]) => {
      let [activity_type] = activityType.split('_');
      activity_type = activity_type === 'break' ? ActivityType.break : activity_type;
      return deserializedActivities.flatMap((deserializedActivity) => {
        return this.createActivityTemplate(deserializedActivity, { activity_type, user_id, pack_id });
      });
    });
  }

  createActivityTemplate(
    { id, duration_seconds, log_quantity, log_summary_type, choices, ...activityDataValues }: UpdateActivityTemplateDto,
    { activity_type, user_id, pack_id },
  ): ActivityTemplate[] {
    const has_choices = choices?.length > 0;
    const activity_data = new ActivityData(activityDataValues);
    const activity = new ActivityTemplate({
      id,
      pack_id,
      activity_data,
      activity_type,
      user_id,
      duration_seconds,
      log_quantity: has_choices ? false : log_quantity,
      log_summary_type: has_choices ? 'SUM' : log_summary_type,
      has_choices,
    });
    const newActivityTemplateAndChoices = [activity];
    if (has_choices) newActivityTemplateAndChoices.push(...this.deserializeActivityTemplateChoices(choices, activity));
    return newActivityTemplateAndChoices;
  }

  private deserializeActivityTemplateChoices(
    choices: ActivityChoiceData[],
    parent: ActivityTemplate,
  ): ActivityTemplate[] {
    return choices.map(
      ({ id, log_quantity, log_summary_type, ...rest }) =>
        new ActivityTemplate({
          id,
          pack_id: parent.pack_id,
          activity_data: new ActivityData(rest),
          parent_id: parent.id,
          activity_type: parent.activity_type,
          user_id: parent.user_id,
          duration_seconds: parent.duration_seconds,
          log_quantity,
          log_summary_type,
          has_choices: null,
        }),
    );
  }

  serialize(pack_type: string, activity_templates: ActivityTemplate[]): SerializedActivityTemplates {
    const fetchedActivities = activity_templates.filter((activity) => !activity.parent_id);
    let serializedActivityTemplates: SerializedActivityTemplates = {};
    const getType = (activity_type: string) => (activity_type === ActivityType.break ? 'break' : activity_type);
    const mapActivity = ({
      id,
      duration_seconds,
      pack_id,
      log_quantity,
      log_summary_type,
      activity_data,
      activity_type,
      choices,
    }: ActivityTemplate) => ({
      id,
      ...activity_data,
      activity_type: `${getType(activity_type)}_activity`,
      duration_seconds: Number(duration_seconds),
      pack_id,
      log_quantity,
      log_summary_type,
      choices: choices?.map(mapActivity),
    });

    const formatActivityTemplates = (fetchedTemplateArray: ActivityTemplate[], activityType: ActivityType) => {
      const activitiesOfType = fetchedTemplateArray.filter(
        (activityTemplate) => activityTemplate.activity_type === activityType,
      );
      const formattedActivitiesOfType = activitiesOfType.map(mapActivity);
      return { [`${getType(activityType)}_activities`]: formattedActivitiesOfType };
    };

    if (pack_type === HabitPackType.standalone) {
      const formattedStandaloneActivities = formatActivityTemplates(fetchedActivities, ActivityType.standalone);
      serializedActivityTemplates = { ...formattedStandaloneActivities };
      return serializedActivityTemplates;
    }

    return {
      ...formatActivityTemplates(fetchedActivities, ActivityType.morning),
      ...formatActivityTemplates(fetchedActivities, ActivityType.break),
      ...formatActivityTemplates(fetchedActivities, ActivityType.evening),
    };
  }
}
