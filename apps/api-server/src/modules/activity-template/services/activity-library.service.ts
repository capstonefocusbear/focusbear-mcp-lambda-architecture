import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { In } from 'typeorm';
import { randomUUID } from 'crypto';
import { UpdateActivityDto } from '../../activity/dto/update-activity.dto';
import { UserRepository } from '../../user/repositories/user.repository';
import { UpdateActivityTemplateDto } from '../dto/activity-template.dto';
import { ActivityTemplateRepository } from '../repository/activity-template.repository';
import { ActivityTemplateParserService } from './activity-template-parser.service';
import { ActivityRepository } from '../../activity/repositories/activity.repository';
import { ActivityType } from '../../activity/domain/activity-type.enum';
import { GetRoutineSuggestionsDto } from '../dto/get-routine-suggestions.dto';
import { ActivityTemplate } from '../entity/activity-template.entity';
import { ONE_MINUTE_SECONDS } from '../../../shared/utils/constants';
import { OpenAIService } from '../../../../../../libs/openai/src/openai.service';
import { AdjustHabitsWithAiDto } from '../dto/adjust-habits-with-ai.dto';

@Injectable()
export class ActivityLibraryService {
  constructor(
    private readonly activityTemplateRepository: ActivityTemplateRepository,
    private readonly activityTemplateParserService: ActivityTemplateParserService,
    private readonly activityRepository: ActivityRepository,
    private readonly userRepository: UserRepository,
    @InjectSentry() private readonly sentryService: SentryService,
    private readonly openAIService: OpenAIService,
  ) {}

  async getLibraryActivities(user_id: string): Promise<UpdateActivityDto[]> {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Fetching user library activities',
        data: { user_id },
      });
      await this.validateUser(user_id);
      const libraryActivitiesPromise = this.activityTemplateRepository.orm.find({
        where: { user_id, activity_type: 'library' },
        relations: ['choices', 'choices.log_quantity_questions', 'log_quantity_questions', 'tags'],
      });
      const userActivitiesPromise = this.activityRepository.orm.find({
        where: { user_id },
        relations: ['choices', 'choices.log_quantity_questions', 'log_quantity_questions'],
      });
      const [libraryActivities, userActivities] = await Promise.all([libraryActivitiesPromise, userActivitiesPromise]);
      return this.activityTemplateParserService.serializeLibraryActivities([...libraryActivities, ...userActivities]);
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async upsertLibraryActivities(updateActivities: UpdateActivityTemplateDto[], user_id: string) {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Updating user library activities',
        data: { user_id },
      });
      await this.validateUser(user_id);
      const activitiesToUpsert = await this.removeActivitiesNotBelongingToUser(updateActivities, user_id);
      const { deserializedActivityTemplates, logQuantityQuestions, templateTags } =
        this.activityTemplateParserService.deserializeLibraryActivities(activitiesToUpsert, user_id);
      const activityIds = deserializedActivityTemplates.map((activityTemplate) => activityTemplate.id);
      await this.activityTemplateRepository.consistentlyUpdateLibraryActivities(
        activityIds,
        deserializedActivityTemplates,
        user_id,
        logQuantityQuestions,
        templateTags,
      );
      return await this.getLibraryActivities(user_id);
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async removeActivitiesNotBelongingToUser(updateActivities: UpdateActivityTemplateDto[], user_id: string) {
    const templateActivitiesOnly = updateActivities.filter(
      (activity) => activity.activity_type === ActivityType.library,
    );
    const incomingActivityIds = templateActivitiesOnly.map((activity) => activity.id);
    const existingActivities = await this.activityTemplateRepository.orm.find({
      where: { id: In(incomingActivityIds) },
    });
    const activitiesNotBelongingToUser = existingActivities
      .filter((activity) => activity.user_id !== user_id)
      .map((activity) => activity.id);
    return templateActivitiesOnly.filter(({ id }) => !activitiesNotBelongingToUser.includes(id));
  }

  async getActivitiesRelatedToUserGoals(getRoutineSuggestionsDto: GetRoutineSuggestionsDto, user_id: string) {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'get activities related to user goals',
        data: { ...getRoutineSuggestionsDto, user_id },
      });

      await this.validateUser(user_id);

      const activityTemplates = await this.activityTemplateRepository.getActivityTemplatesWithGoalsMatched(
        getRoutineSuggestionsDto,
      );
      const updateActivityTemplates = activityTemplates.sort(
        (activityTemplateA, activityTemplateB) =>
          activityTemplateA.duration_seconds - activityTemplateB.duration_seconds,
      );
      const templates: ActivityTemplate[] = this.userDesiredRoutineDurationSeconds(
        updateActivityTemplates,
        getRoutineSuggestionsDto.routine_duration * ONE_MINUTE_SECONDS,
      );

      if (!templates.length) {
        return [];
      }
      if (getRoutineSuggestionsDto.groupByGoals) {
        const groupedByGoal: Record<
          string,
          Omit<ActivityTemplate, 'tags'> &
            {
              tags: string[];
            }[]
        > = {};
        for (const goal of getRoutineSuggestionsDto.user_goals ?? []) {
          groupedByGoal[goal] = templates
            .filter((template: ActivityTemplate) => {
              return template.tags?.some((tag) => tag.tags.includes(goal));
            })
            .map((template) => ({ ...template, tags: template.tags.flatMap((tag) => tag.tags) }));
        }

        return groupedByGoal;
      }
      return templates;
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  /**
   * selects activities that fit the user's desired routine duration for morning and evening routines
   * @param activityTemplates the suggested activities that match the user's goals
   * @param userRoutineDurationSeconds the user's desired routine duration in seconds
   * @returns activities that fit the user's desired routine duration
   */
  userDesiredRoutineDurationSeconds(activityTemplates: ActivityTemplate[], userRoutineDurationSeconds: number) {
    const MAX_NUMBER_OF_ROUTINE_HABITS = 5;
    const routineLength = {
      [ActivityType.morning]: 0,
      [ActivityType.evening]: 0,
    };
    const allValidActivities = [];
    const routineDuration = {
      [ActivityType.morning]: 0,
      [ActivityType.evening]: 0,
    }; // @Description: unit of duration is seconds

    const morningAndEveningActivityTemplates = activityTemplates.filter(
      (activityTemplate) =>
        activityTemplate.activity_type === ActivityType.morning ||
        activityTemplate.activity_type === ActivityType.evening,
    );
    morningAndEveningActivityTemplates
      ?.sort((templateA, templateB) => templateA.duration_seconds - templateB.duration_seconds)
      ?.some((activityTemplate) => {
        const template_duration = parseInt(activityTemplate.duration_seconds?.toString(), 10);
        if (
          (routineDuration[ActivityType.morning] >= userRoutineDurationSeconds &&
            routineDuration[ActivityType.evening] >= userRoutineDurationSeconds) ||
          (routineLength[ActivityType.morning] >= MAX_NUMBER_OF_ROUTINE_HABITS &&
            routineLength[ActivityType.evening] >= MAX_NUMBER_OF_ROUTINE_HABITS)
        ) {
          return true;
        }
        const isValidDuration = this.isValidTemplateDuration(
          template_duration,
          routineDuration[activityTemplate.activity_type],
          userRoutineDurationSeconds,
        );
        if (isValidDuration) {
          routineDuration[activityTemplate.activity_type] += template_duration;
          const { activity_data, ...rest } = activityTemplate;
          allValidActivities.push({ ...rest, ...activity_data, id: randomUUID() });
          routineLength[activityTemplate.activity_type] += 1;
        }
        return false;
      });
    return allValidActivities;
  }

  isValidTemplateDuration(template_duration: number, routine_duration: number, user_routine_duration: number) {
    const expected_routine_duration = template_duration + routine_duration;
    return expected_routine_duration <= user_routine_duration;
  }

  async validateUser(user_id: string) {
    const user = await this.userRepository.orm.findOneBy({ id: user_id });
    if (!user) throw new NotFoundException(`User with ID: ${user_id} does not exist!`);
    return user;
  }

  async adjustHabitsWithAi(adjustHabitsWithAiDto: AdjustHabitsWithAiDto, user_id: string) {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Adjusting habits with AI',
        data: { user_id, feedback: adjustHabitsWithAiDto.user_feedback },
      });

      await this.validateUser(user_id);

      const adjustedHabits = await this.openAIService.adjustHabitsWithAi(
        adjustHabitsWithAiDto.current_habits,
        adjustHabitsWithAiDto.user_feedback,
        adjustHabitsWithAiDto.user_goals,
        adjustHabitsWithAiDto.routine_duration,
        adjustHabitsWithAiDto.groupByGoals,
      );

      return adjustedHabits;
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }
}
