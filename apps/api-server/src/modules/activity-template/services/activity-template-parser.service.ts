import { Injectable } from '@nestjs/common';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { ActivityChoiceData } from '../../activity/domain/activity-choice-data.model';
import { ActivityData } from '../../activity/domain/activity-data.model';
import { ActivityType } from '../../activity/domain/activity-type.enum';
import { UpdateActivityDto } from '../../activity/dto/update-activity.dto';
import { HabitPackType } from '../../habit-pack/domain/habit-pack-type.enum';
import { UpdateActivityTemplateDto } from '../dto/activity-template.dto';
import { ActivityTemplate } from '../entity/activity-template.entity';
import { LogQuantityQuestion } from '../../activity/entities/log-quantity-questions';

export interface SerializedActivityTemplates {
  morning_activities?: UpdateActivityTemplateDto[];
  evening_activities?: UpdateActivityTemplateDto[];
  break_activities?: UpdateActivityTemplateDto[];
  standalone_activities?: UpdateActivityTemplateDto[];
  library_activities?: UpdateActivityTemplateDto[];
}

@Injectable()
export class ActivityTemplateParserService {
  constructor(@InjectSentry() private readonly sentryService: SentryService) {}

  /*
  Returns an array that has an array of standalone activities. nested array format needed for consistentlyUpdateHabitPack function
  in habit-pack.service.ts
  activityType is split from "standalone_activity" to "standalone" and is used to insert the type for activities and their choices
  */
  deserializeStandaloneActivities(
    serialized: SerializedActivityTemplates,
    user_id: string,
    pack_id: string,
  ): { deserializedActivityTemplates: ActivityTemplate[]; logQuantityQuestions: LogQuantityQuestion[] } {
    this.sentryService.instance().addBreadcrumb({
      category: 'Service',
      level: 'debug',
      message: 'Deserializing standalone activities',
    });
    const entries = Object.entries(serialized);
    const deserializedActivityTemplates = entries.map(([activityType, deserializedActivities]) => {
      const [activity_type] = activityType.split('_');
      return deserializedActivities.flatMap((deserializedActivity, index) => {
        return this.createActivityTemplate(deserializedActivity, { activity_type, user_id, pack_id, index });
      });
    });
    const logQuantityQuestions = this.getLogQuantityQuestions(serialized, user_id);
    return { deserializedActivityTemplates, logQuantityQuestions };
  }

  /*
  Returns an array that contains three arrays of ActivityTemplate objects, one for each activity type: morning, break, and evening.
  activityType is split and used to insert the type for activities and their choices. Example: "morning_activites" -> "morning"
  */
  deserializeRoutineActivities(
    serialized: SerializedActivityTemplates,
    user_id: string,
    pack_id: string,
  ): { deserializedActivityTemplates: ActivityTemplate[]; logQuantityQuestions: LogQuantityQuestion[] } {
    this.sentryService.instance().addBreadcrumb({
      category: 'Service',
      level: 'debug',
      message: 'Deserializing routine activities',
    });
    const entries = Object.entries(serialized);
    const deserializedActivityTemplates = entries.map(([activityType, deserializedActivities]) => {
      let [activity_type] = activityType.split('_');
      activity_type = activity_type === 'break' ? ActivityType.break : activity_type;
      return deserializedActivities.flatMap((deserializedActivity, index) => {
        return this.createActivityTemplate(deserializedActivity, { activity_type, user_id, pack_id, index });
      });
    });
    const logQuantityQuestions = this.getLogQuantityQuestions(serialized, user_id);
    return { deserializedActivityTemplates, logQuantityQuestions };
  }

  deserializeLibraryActivities(
    serialized: UpdateActivityTemplateDto[],
    user_id: string,
  ): { deserializedActivityTemplates: ActivityTemplate[]; logQuantityQuestions: LogQuantityQuestion[] } {
    this.sentryService.instance().addBreadcrumb({
      category: 'Service',
      level: 'debug',
      message: 'Deserializing library activities',
    });
    const logQuantityQuestions = this.getLogQuantityQuestions({ library_activities: serialized }, user_id);
    const deserializedActivityTemplates = serialized.flatMap((deserializedActivity, index) => {
      return this.createActivityTemplate(deserializedActivity, { activity_type: ActivityType.library, user_id, index });
    });
    return { deserializedActivityTemplates, logQuantityQuestions };
  }

  createActivityTemplate(
    {
      id,
      duration_seconds,
      completion_requirements,
      log_quantity,
      log_summary_type,
      choices,
      linked_activity_template_id,
      ...activityDataValues
    }: UpdateActivityTemplateDto,
    {
      activity_type,
      user_id,
      pack_id,
      index,
    }: { activity_type: string | null; user_id: string; pack_id?: string; index: number },
  ): ActivityTemplate[] {
    this.sentryService.instance().addBreadcrumb({
      category: 'Service',
      level: 'debug',
      message: 'Creating activity template',
    });
    const has_choices = choices?.length > 0;
    const activity_data = new ActivityData(activityDataValues);
    const activity = new ActivityTemplate({
      id,
      pack_id,
      activity_data,
      activity_type,
      user_id,
      duration_seconds,
      completion_requirements,
      log_quantity: has_choices ? false : log_quantity,
      log_summary_type: has_choices ? 'SUM' : log_summary_type,
      has_choices,
      sequence_index: index,
      linked_activity_template_id,
    });
    const newActivityTemplateAndChoices = [activity];
    if (has_choices) newActivityTemplateAndChoices.push(...this.deserializeActivityTemplateChoices(choices, activity));
    return newActivityTemplateAndChoices;
  }

  getLogQuantityQuestions(serializedActivities: SerializedActivityTemplates, userId: string) {
    const activitySequenceArrays = Object.values(serializedActivities);
    const updateActivities = [].concat(...activitySequenceArrays);
    const activitiesAndChoices = updateActivities.flatMap((activity) => {
      const choices = activity?.choices ?? [];
      return [activity, ...choices];
    });
    const questionsArrays = activitiesAndChoices.map((activity: UpdateActivityDto) => {
      return this.createLogQuantityQuestions(activity, userId);
    });
    const questions = questionsArrays.flatMap((array) => array);
    return questions;
  }

  createLogQuantityQuestions(activity: UpdateActivityDto, userId: string) {
    const { id, log_quantity_questions } = activity;
    const questionsForActivity = log_quantity_questions?.map(
      (question) =>
        new LogQuantityQuestion({ ...question, activity_template_id: id, activity_id: null, user_id: userId }),
    );
    return questionsForActivity?.length > 0 ? questionsForActivity : [];
  }

  private deserializeActivityTemplateChoices(
    choices: ActivityChoiceData[],
    parent: ActivityTemplate,
  ): ActivityTemplate[] {
    this.sentryService.instance().addBreadcrumb({
      category: 'Service',
      level: 'debug',
      message: 'Deserializing activity template choices',
    });
    return choices.map(
      ({ id, log_quantity, log_summary_type, completion_requirements, linked_activity_template_id, ...rest }) =>
        new ActivityTemplate({
          id,
          pack_id: parent.pack_id,
          activity_data: new ActivityData(rest),
          parent_id: parent.id,
          activity_type: parent.activity_type,
          user_id: parent.user_id,
          duration_seconds: parent.duration_seconds,
          completion_requirements,
          log_quantity,
          log_summary_type,
          has_choices: null,
          linked_activity_template_id,
        }),
    );
  }

  serialize(pack_type: string, activity_templates: ActivityTemplate[]): SerializedActivityTemplates {
    this.sentryService.instance().addBreadcrumb({
      category: 'Service',
      level: 'debug',
      message: 'Serializing habit pack activities',
    });
    const fetchedActivities = activity_templates.filter((activity) => !activity.parent_id);
    let serializedActivityTemplates: SerializedActivityTemplates = {};
    const getType = (activity_type: string) => (activity_type === ActivityType.break ? 'break' : activity_type);
    const mapActivity = ({
      id,
      duration_seconds,
      completion_requirements,
      pack_id,
      log_quantity,
      log_summary_type,
      activity_data,
      activity_type,
      choices,
      log_quantity_questions,
      linked_activity_template_id,
    }: ActivityTemplate) => ({
      id,
      ...activity_data,
      activity_type: `${getType(activity_type)}_activity`,
      duration_seconds: Number(duration_seconds),
      completion_requirements: completion_requirements ?? undefined,
      pack_id,
      log_quantity,
      log_summary_type,
      choices: choices?.map(mapActivity),
      log_quantity_questions,
      linked_activity_template_id,
    });

    const formatActivityTemplates = (fetchedTemplateArray: ActivityTemplate[], activityType: ActivityType) => {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Formatting activity templates',
      });
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

  serializeLibraryActivities(activity_templates: ActivityTemplate[]): UpdateActivityDto[] {
    this.sentryService.instance().addBreadcrumb({
      category: 'Service',
      level: 'debug',
      message: 'Serializing library activities',
    });
    const fetchedActivities = activity_templates.filter((activity) => !activity.parent_id);
    const mapActivity = ({
      id,
      duration_seconds,
      completion_requirements,
      pack_id,
      log_quantity,
      log_summary_type,
      activity_data,
      choices,
      log_quantity_questions,
    }: ActivityTemplate) => {
      return {
        id,
        ...activity_data,
        duration_seconds: Number(duration_seconds),
        completion_requirements,
        pack_id,
        log_quantity,
        log_summary_type,
        choices: choices?.map(mapActivity),
        log_quantity_questions,
      };
    };
    return fetchedActivities.map(mapActivity);
  }
}
