import { Injectable } from '@nestjs/common';
import { InjectSentry, SentryService } from '@app/observability';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { ACITIVITY_EMOJI_MAP, BullQueues, BullWorkers } from '../../../../shared/utils/constants';
import { ActivityChoiceData } from '../../domain/activity-choice-data.model';
import { ActivityData } from '../../domain/activity-data.model';
import { ActivityType } from '../../domain/activity-type.enum';
import { UpdateActivityDto } from '../../dto/update-activity.dto';
import { ActivitySequence } from '../../entities/activity-sequence.entity';
import { Activity } from '../../entities/activity.entity';
import { ActivitySequenceRepository } from '../../repositories/activity-sequence.repository';
import { LogQuantityQuestion } from '../../entities/log-quantity-questions';
import { Tutorial } from '../../entities/tutorial.entity';
import { CustomRoutine } from '../../../user/entities/custom-routine';
import { UpdateCustomRoutineDto } from '../../../user/dto/update-custom-routine.dto.dto';

export interface DeserializedActivity {
  sequence: ActivitySequence;
  activities: Activity[];
}

export interface SerializedActivity {
  morning_activities?: UpdateActivityDto[];
  evening_activities?: UpdateActivityDto[];
  break_activities?: UpdateActivityDto[];
  standalone_activities?: UpdateActivityDto[];
  custom_routines?: UpdateCustomRoutineDto[];
}

@Injectable()
export class ActivityParserService {
  constructor(
    private readonly activitySequenceRepository: ActivitySequenceRepository,
    @InjectSentry() private readonly sentryService: SentryService,
    @InjectQueue(BullQueues.EMOJI_GENERATION) private readonly emojiGenerationQueue: Queue,
  ) {}

  serialize(activity_sequences: Partial<ActivitySequence>[], userCustomRoutines?: CustomRoutine[]): SerializedActivity {
    this.sentryService.instance().addBreadcrumb({
      category: 'Service',
      level: 'debug',
      message: 'Serializing activities (formatting activities to be sent to front end)',
    });
    const serializedActivities: SerializedActivity = {};
    for (const { type, activities, activity_ids, custom_routine_id, id: sequence_id } of activity_sequences) {
      const transformTutorial = (tutorial: any) => (tutorial && typeof tutorial === 'object' ? tutorial.id : tutorial);

      const mapActivity = ({
        id,
        duration_seconds,
        activity_sequence_id,
        activity_template_id,
        log_quantity,
        log_summary_type,
        activity_data,
        choices,
        is_default,
        run_micro_breaks,
        days_of_week,
        completion_requirements,
        log_quantity_questions,
        linked_activity_id,
        check_list,
        impact_category,
        created_at,
        tutorial,
        cutoff_time_for_doing_activity,
      }: Activity) => {
        const currentEmoji = activity_data?.habit_icon;
        const needsEmojiGeneration = !currentEmoji || currentEmoji === '';
        if (needsEmojiGeneration) {
          this.addEmojiGenerationJob(activity_data?.name, id);
        }

        return {
          id,
          choices: choices?.map(mapActivity),
          duration_seconds: Number(duration_seconds),
          activity_sequence_id,
          activity_template_id,
          log_quantity,
          log_summary_type,
          is_default,
          run_micro_breaks,
          days_of_week,
          completion_requirements: completion_requirements ?? undefined,
          log_quantity_questions,
          linked_activity_id,
          check_list,
          impact_category,
          created_at,
          ...activity_data,
          tutorial: transformTutorial(tutorial),
          cutoff_time_for_doing_activity,
          activity_type: type,
        };
      };

      const orderedActivities = Array.from(new Set(activity_ids))
        .map((id) => activities.find((e) => e.id === id))
        .filter(Boolean)
        .map(mapActivity);

      if (type === ActivityType.standalone) {
        const custom_routine = userCustomRoutines?.find((routine) => routine.id === custom_routine_id);
        if (custom_routine) {
          const { user_id, ...rest } = custom_routine;
          const updateCustomRoutineDto = {
            ...rest,
            standalone_activities: orderedActivities,
            activity_sequence_id: sequence_id,
          };
          serializedActivities.custom_routines = [
            ...(serializedActivities.custom_routines ?? []),
            updateCustomRoutineDto,
          ];
        } else {
          serializedActivities.standalone_activities = orderedActivities;
        }
      } else {
        let key = `${type}_activities`;
        if (type === ActivityType.break) key = 'break_activities';
        serializedActivities[key] = orderedActivities;
      }
    }
    return serializedActivities;
  }

  async deserialize(
    serialized: SerializedActivity,
    user_id: string,
    pack_id?: string,
  ): Promise<{
    deserializedActivities: DeserializedActivity[];
    logQuantityQuestions: LogQuantityQuestion[];
    tutorials: Tutorial[];
  }> {
    this.sentryService.instance().addBreadcrumb({
      category: 'Service',
      level: 'debug',
      message: 'Deserializing activities (formatting activities to be saved in DB)',
      data: {
        user_id,
      },
    });
    const logQuantityQuestions = this.getLogQuantityQuestions(serialized, user_id);
    const tutorials = this.getActivitiesTutorial(serialized, user_id);
    const entries = Object.entries(serialized);
    const deserializedActivities = await Promise.all(
      entries.map(async ([name, serializedActivities]) => {
        let [type] = name.split('_');
        if (type === 'break') type = ActivityType.break;
        const sequence = await this.createActivitySequence(serializedActivities, {
          type: type as ActivityType,
          user_id,
          pack_id,
        });
        const activity_sequence_id = sequence.id;
        const context = { type, user_id, activity_sequence_id };
        const activities = (
          await Promise.all(
            (serializedActivities as UpdateActivityDto[]).map((activity) => this.createActivity(activity, context)),
          )
        ).flat();
        return { sequence, activities };
      }),
    );
    return { deserializedActivities, logQuantityQuestions, tutorials };
  }

  getLogQuantityQuestions(serializedActivities: SerializedActivity, userId: string) {
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
    const { id, log_quantity_questions, log_quantity_question, log_summary_type, log_quantity } = activity;
    const questionStrings = log_quantity_questions?.map(({ question }) => question?.toLowerCase());
    // if activity has old format log quantity question and not yet present in new format questions, create new format question from it
    if (log_quantity_question && !questionStrings?.includes(log_quantity_question?.toLowerCase())) {
      const questionFromOldFormat = new LogQuantityQuestion({
        question: log_quantity_question,
        activity_id: id,
        user_id: userId,
        log_summary_type,
      });
      const questionsForActivity = log_quantity_questions?.map(
        (question) => new LogQuantityQuestion({ ...question, activity_id: id, user_id: userId }),
      );
      const logQuantityQuestions = [...(questionsForActivity || []), questionFromOldFormat];
      return logQuantityQuestions?.length > 0 ? logQuantityQuestions : [];
    }
    const questionsForActivity = log_quantity_questions?.map(
      (question) => new LogQuantityQuestion({ ...question, activity_id: id, user_id: userId }),
    );
    // if log quantity is true but there are no questions, add default question
    if (log_quantity && log_quantity_questions?.length < 1 && !log_quantity_question) {
      const defaultQuestion = new LogQuantityQuestion({
        question: `Log quantity for ${activity.name}`,
        activity_id: id,
        user_id: userId,
        log_summary_type,
      });
      questionsForActivity.push(defaultQuestion);
    }
    return questionsForActivity?.length > 0 ? questionsForActivity : [];
  }

  private addEmojiGenerationJob(activityName: string, activityId: string) {
    const normalizedName = this.normalizeActivityName(activityName);
    this.emojiGenerationQueue.add(BullWorkers.GENERATE_ACTIVITY_EMOJI, {
      activity_id: activityId,
      activity_name: normalizedName,
    });
  }

  private getLocalEmojiForActivity(activityName: string, activityId: string) {
    const normalizedName = this.normalizeActivityName(activityName);
    const predefinedEmoji = ACITIVITY_EMOJI_MAP[normalizedName];
    if (predefinedEmoji) return predefinedEmoji;
    // if no predefined emoji, add job to generate emoji
    this.emojiGenerationQueue.add(BullWorkers.GENERATE_ACTIVITY_EMOJI, {
      activity_id: activityId,
      activity_name: normalizedName,
    });
    return '';
  }

  private normalizeActivityName(activityName: string): string {
    // Create a consistent key for caching by normalizing the activity name
    return activityName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
  }

  private async createActivity(
    {
      id,
      duration_seconds,
      log_quantity,
      log_summary_type,
      activity_template_id,
      choices,
      is_default,
      run_micro_breaks,
      days_of_week,
      completion_requirements,
      linked_activity_id,
      check_list,
      // destructure log_quantity_question to remove it from activity_data field as it will be saved
      // in the new format in getLogQuantityQuestions function
      log_quantity_question,
      impact_category,
      cutoff_time_for_doing_activity,
      ...rest
    }: UpdateActivityDto,
    { type, user_id, activity_sequence_id },
  ): Promise<Activity[]> {
    this.sentryService.instance().addBreadcrumb({
      category: 'Service',
      level: 'debug',
      message: 'Create activity',
      data: {
        activity_id: id,
      },
    });

    const has_choices = choices?.length > 0;
    const activity_data = this.createActivityData({ ...rest, id });
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
      is_default,
      run_micro_breaks,
      days_of_week,
      completion_requirements,
      linked_activity_id,
      check_list,
      impact_category,
      cutoff_time_for_doing_activity,
    });
    const result = [activity];
    if (has_choices) result.push(...this.deserializeChoices(choices, activity));
    return result;
  }

  private createActivityData(activity: UpdateActivityDto | ActivityChoiceData): ActivityData {
    const activityData = new ActivityData(activity);
    activityData.habit_icon =
      activity.habit_icon && activity.habit_icon !== ''
        ? activity.habit_icon
        : this.getLocalEmojiForActivity(activity.name, activity.id);
    return activityData;
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
      ({
        id,
        log_quantity,
        log_summary_type,
        completion_requirements,
        linked_activity_id,
        activity_template_id,
        // destructure log_quantity_question to remove it from activity_data field as it will be saved
        // in the new format in getLogQuantityQuestions function
        log_quantity_question,
        ...rest
      }) =>
        new Activity({
          id,
          activity_data: this.createActivityData({ ...rest, id }),
          parent_id: parent.id,
          type: parent.type,
          user_id: parent.user_id,
          activity_sequence_id: null,
          duration_seconds: parent.duration_seconds,
          log_quantity,
          log_summary_type,
          has_choices: null,
          is_default: parent.is_default,
          run_micro_breaks: parent.run_micro_breaks,
          days_of_week: parent.days_of_week,
          completion_requirements,
          linked_activity_id,
          activity_template_id,
        }),
    );
  }

  private async createActivitySequence(
    serializedActivities: Activity[] | UpdateActivityDto[],
    {
      type,
      user_id,
      pack_id,
      custom_routine_id,
    }: { type: ActivityType; user_id: string; pack_id?: string; custom_routine_id?: string },
  ): Promise<ActivitySequence> {
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
    const total_duration_seconds = this.calculateSequenceDuration(serializedActivities as Activity[]);
    let sequenceItem;
    if (custom_routine_id) {
      sequenceItem = await this.activitySequenceRepository.findOneByTypeAndCustomRoutineForUser(
        type,
        user_id,
        custom_routine_id,
      );
    } else if (type !== ActivityType.standalone) {
      /*
        If activities are of type "standalone", searching in DB for a sequence to update should be skipped.
        A new activity sequence needs to be created each time a standalone habit pack is installed
        to ensure that activities from different standalone packs aren't merged
      */
      sequenceItem = await this.activitySequenceRepository.findOneByTypeForUser(type, user_id);
    }

    const sequence = new ActivitySequence(
      { type, activity_ids, user_id, total_duration_seconds, id: sequenceItem?.id, pack_id, custom_routine_id },
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

  getActivitiesTutorial(serializedActivities: SerializedActivity, user_id: string) {
    const activities: UpdateActivityDto[] = Object.values(serializedActivities).flat();
    return activities.reduce((tutorials: Tutorial[], activity) => {
      if (activity?.tutorial) {
        tutorials.push(new Tutorial({ id: activity.tutorial, activity_id: activity.id, user_id }));
      }
      return tutorials;
    }, []);
  }

  async deserializeCustomRoutineActivities(
    customRoutines: UpdateCustomRoutineDto[],
    user_id: string,
  ): Promise<{ sequence: ActivitySequence; activities: Activity[] }[]> {
    return Promise.all(
      customRoutines.map(async (routine) => {
        const type = ActivityType.standalone;
        const routine_activities = (routine?.standalone_activities ?? []) as UpdateActivityDto[];
        const sequence = await this.createActivitySequence(routine_activities, {
          type,
          user_id,
          custom_routine_id: routine.id,
        });
        const activity_sequence_id = sequence.id;
        const context = { type, user_id, activity_sequence_id, custom_routine_id: routine.id };
        // ✅ FIXED: Properly await all promises
        // ❌ BEFORE: Used flatMap without awaiting promises:
        //    const createActivity = (e) => (activity: UpdateActivityDto) => this.createActivity(activity, e);
        //    const activities: Activity[] = routine_activities.flatMap(createActivity(context));
        //    This returned Promise<Activity[]>[] instead of Activity[], so activities were never created
        //    and custom routine habits weren't being saved to the database.
        const activities: Activity[] = (
          await Promise.all(routine_activities.map((activity) => this.createActivity(activity, context)))
        ).flat();
        return { sequence, activities };
      }),
    );
  }
}
