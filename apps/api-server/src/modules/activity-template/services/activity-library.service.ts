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
import { ActivityTemplateRetrieverService } from './activity-template-retriever.service';
import {
  RoutineSuggestionGeneratorService,
  RoutineSuggestionResult,
  GeneratedHabitSuggestion,
} from './routine-suggestion-generator.service';
import { HabitLibraryRequestRepository } from '../repository/habit-library-request.repository';

const MAX_ROUTINE_HABITS_PER_TYPE = 5;
const RAG_RETRIEVAL_LIMIT = 10;
const DEFAULT_GENERATED_ACTIVITY_MINUTES = 10;

@Injectable()
export class ActivityLibraryService {
  constructor(
    private readonly activityTemplateRepository: ActivityTemplateRepository,
    private readonly activityTemplateParserService: ActivityTemplateParserService,
    private readonly activityRepository: ActivityRepository,
    private readonly userRepository: UserRepository,
    private readonly activityTemplateRetrieverService: ActivityTemplateRetrieverService,
    private readonly routineSuggestionGeneratorService: RoutineSuggestionGeneratorService,
    private readonly habitLibraryRequestRepository: HabitLibraryRequestRepository,
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

      const routineDurationSeconds = getRoutineSuggestionsDto.routine_duration * ONE_MINUTE_SECONDS;

      const directMatches = await this.activityTemplateRepository.getActivityTemplatesWithGoalsMatched(
        getRoutineSuggestionsDto,
      );
      const orderedMatches = directMatches.sort(
        (activityTemplateA, activityTemplateB) =>
          activityTemplateA.duration_seconds - activityTemplateB.duration_seconds,
      );
      const directTemplates = this.userDesiredRoutineDurationSeconds(orderedMatches, routineDurationSeconds);

      if (directTemplates.length) {
        if (getRoutineSuggestionsDto.groupByGoals) {
          const groupedByGoal: Record<string, ActivityTemplate[]> = {};
          for (const goal of getRoutineSuggestionsDto.user_goals ?? []) {
            groupedByGoal[goal] = directTemplates
              .filter((template: ActivityTemplate) => template.tags?.some((tag) => tag.tags.includes(goal)))
              .map((template) => ({
                ...template,
                tags: template.tags?.flatMap((tag) => tag.tags) ?? [],
              }));
          }
          return groupedByGoal;
        }
        return directTemplates;
      }

      const ragResult = await this.getActivitiesFromRag(getRoutineSuggestionsDto, routineDurationSeconds, user_id);
      if (getRoutineSuggestionsDto.groupByGoals) {
        return ragResult.groupedByGoal ?? {};
      }
      return ragResult.templates;
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
  userDesiredRoutineDurationSeconds(
    activityTemplates: ActivityTemplate[],
    userRoutineDurationSeconds: number,
    metadataMap: Map<
      string,
      { justification: string; matchScore: number; goals: string[]; name?: string; description?: string }
    > = new Map(),
  ) {
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
          (routineLength[ActivityType.morning] >= MAX_ROUTINE_HABITS_PER_TYPE &&
            routineLength[ActivityType.evening] >= MAX_ROUTINE_HABITS_PER_TYPE)
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
          const metadata = metadataMap.get(activityTemplate.id);
          const baseActivity: any = {
            ...rest,
            ...activity_data,
            id: randomUUID(),
            original_template_id: activityTemplate.id,
            ai_generated: false,
            ai_justification: metadata?.justification ?? '',
            ai_match_score: typeof metadata?.matchScore === 'number' ? Number(metadata.matchScore.toFixed(2)) : null,
            ai_goals: metadata?.goals ?? [],
          };
          const overrideName = metadata?.name ?? baseActivity.name;
          if (overrideName) {
            baseActivity.name = overrideName;
          }
          const overrideDescription = metadata?.description ?? baseActivity.text_instructions;
          if (overrideDescription) {
            baseActivity.text_instructions = overrideDescription;
            baseActivity.description = overrideDescription;
          }
          if (!baseActivity.description && baseActivity.text_instructions) {
            baseActivity.description = baseActivity.text_instructions;
          }
          allValidActivities.push(baseActivity);
          routineLength[activityTemplate.activity_type] += 1;
        }
        return false;
      });
    return allValidActivities;
  }

  private async getActivitiesFromRag(
    getRoutineSuggestionsDto: GetRoutineSuggestionsDto,
    routineDurationSeconds: number,
    userId?: string,
  ): Promise<{ templates: ActivityTemplate[]; groupedByGoal?: Record<string, ActivityTemplate[]> }> {
    const goals = getRoutineSuggestionsDto.user_goals ?? [];
    if (!goals.length) {
      return { templates: [], groupedByGoal: {} };
    }

    const goalResults = await Promise.all(
      goals.map(async (goal) => {
        const options = {
          limit: RAG_RETRIEVAL_LIMIT,
          routineType: getRoutineSuggestionsDto.routine,
          routineDurationSeconds,
        };
        try {
          const matches = await this.activityTemplateRetrieverService.retrieveByGoal(goal, RAG_RETRIEVAL_LIMIT);
          if (!matches.length) {
            const generated = await this.routineSuggestionGeneratorService.generateNewHabits(goal, options);
            return { goal, suggestions: [] as RoutineSuggestionResult[], generated };
          }

          const matchedIds = matches.map((match) => match.activityTemplateId);
          const matchedTemplates = await this.activityTemplateRepository.orm.find({
            where: { id: In(matchedIds) },
            relations: ['tags'],
          });
          const templateMap = new Map(matchedTemplates.map((template) => [template.id, template]));
          const candidates = matches
            .map((match) => {
              const template = templateMap.get(match.activityTemplateId);
              if (!template) {
                return null;
              }
              return {
                template,
                similarity: match.similarity,
              };
            })
            .filter((candidate): candidate is { template: ActivityTemplate; similarity: number } => !!candidate);

          if (!candidates.length) {
            const generated = await this.routineSuggestionGeneratorService.generateNewHabits(goal, options);
            return { goal, suggestions: [] as RoutineSuggestionResult[], generated };
          }

          const suggestionResult = await this.routineSuggestionGeneratorService.generateSuggestions(goal, candidates, {
            limit: options.limit,
          });
          if (suggestionResult.accepted.length) {
            return { goal, suggestions: suggestionResult.accepted, generated: [] as GeneratedHabitSuggestion[] };
          }

          this.sentryService.instance().addBreadcrumb({
            category: 'RoutineSuggestion',
            level: 'info',
            message: 'Falling back to generated habits',
            data: { goal, candidateCount: candidates.length, rejectedCount: suggestionResult.rejectedCount },
          });
          const generated = await this.routineSuggestionGeneratorService.generateNewHabits(goal, options);
          if (generated.length) {
            return { goal, suggestions: [] as RoutineSuggestionResult[], generated };
          }

          this.sentryService.instance().captureMessage('RoutineSuggestion: generated habits fallback returned empty', {
            level: 'warning',
            extra: { goal, candidateCount: candidates.length, rejectedCount: suggestionResult.rejectedCount },
          });

          const similarityFallback = this.buildSimilarityFallback(
            goal,
            candidates,
            options.limit ?? RAG_RETRIEVAL_LIMIT,
            suggestionResult.minScoreApplied,
          );
          if (similarityFallback.length) {
            return { goal, suggestions: similarityFallback, generated: [] as GeneratedHabitSuggestion[] };
          }

          return { goal, suggestions: [] as RoutineSuggestionResult[], generated: [] as GeneratedHabitSuggestion[] };
        } catch (error) {
          this.sentryService.instance().captureException(error, {
            level: 'error',
            extra: { goal },
          });
          return { goal, suggestions: [] as RoutineSuggestionResult[], generated: [] as GeneratedHabitSuggestion[] };
        }
      }),
    );

    const metadataAccumulator = new Map<
      string,
      { justification: string; matchScore: number; goals: string[]; name?: string; description?: string }
    >();
    const templatesAccumulator = new Map<string, ActivityTemplate>();
    const suggestionsByGoal: Record<string, RoutineSuggestionResult[]> = {};
    const generatedByGoal: Record<string, GeneratedHabitSuggestion[]> = {};

    goalResults.forEach(({ goal, suggestions, generated }) => {
      suggestionsByGoal[goal] = suggestions;
      if (generated?.length) {
        generatedByGoal[goal] = generated;
      }

      suggestions.forEach((suggestion) => {
        templatesAccumulator.set(suggestion.habitId, suggestion.template);
        const existing = metadataAccumulator.get(suggestion.habitId);
        const suggestionName = suggestion.name || suggestion.template.activity_data?.name;
        const suggestionDescription = suggestion.description || suggestion.template.activity_data?.text_instructions;
        if (existing) {
          if (suggestion.justification) {
            existing.justification = `${existing.justification} ${suggestion.justification}`.trim();
          }
          if (typeof suggestion.matchScore === 'number') {
            existing.matchScore = Math.max(existing.matchScore, suggestion.matchScore);
          }
          existing.goals = Array.from(new Set([...existing.goals, goal]));
          if (suggestionName) {
            existing.name = suggestionName;
          }
          if (suggestionDescription) {
            existing.description = suggestionDescription;
          }
        } else {
          metadataAccumulator.set(suggestion.habitId, {
            justification: suggestion.justification || '',
            matchScore: suggestion.matchScore ?? 0,
            goals: [goal],
            name: suggestionName,
            description: suggestionDescription,
          });
        }
      });
    });

    const aggregatedTemplates = Array.from(templatesAccumulator.values());
    const finalTemplates = this.userDesiredRoutineDurationSeconds(
      aggregatedTemplates,
      routineDurationSeconds,
      metadataAccumulator,
    );

    const generatedActivities = this.buildGeneratedActivities(
      generatedByGoal,
      routineDurationSeconds,
      getRoutineSuggestionsDto.routine,
    );

    await this.persistGeneratedHabits(
      userId,
      generatedByGoal,
      getRoutineSuggestionsDto,
      generatedActivities.flat.length > 0,
    );

    const templatesByOriginalId = new Map(
      finalTemplates
        .filter((template: any) => template.original_template_id)
        .map((template: any) => [template.original_template_id as string, template]),
    );

    let groupedByGoal: Record<string, ActivityTemplate[]> | undefined;
    if (getRoutineSuggestionsDto.groupByGoals) {
      groupedByGoal = {};
      for (const goal of goals) {
        const suggestionEntries = (suggestionsByGoal[goal] ?? [])
          .map((suggestion) => templatesByOriginalId.get(suggestion.habitId))
          .filter((template): template is ActivityTemplate => !!template);
        const generatedEntries = generatedActivities.byGoal[goal] ?? [];
        groupedByGoal[goal] = [...suggestionEntries, ...generatedEntries];
      }
    }

    const combinedTemplates = [...finalTemplates, ...generatedActivities.flat];
    if (!combinedTemplates.length) {
      return {
        templates: [],
        groupedByGoal: groupedByGoal ?? {},
      };
    }

    return {
      templates: combinedTemplates,
      groupedByGoal,
    };
  }

  private buildGeneratedActivities(
    generatedByGoal: Record<string, GeneratedHabitSuggestion[]>,
    routineDurationSeconds: number,
    fallbackRoutineType?: ActivityType | string,
  ): { byGoal: Record<string, ActivityTemplate[]>; flat: ActivityTemplate[] } {
    const byGoal: Record<string, ActivityTemplate[]> = {};
    const flat: ActivityTemplate[] = [];
    const fallbackDurationMinutes = routineDurationSeconds
      ? Math.max(1, Math.round(routineDurationSeconds / ONE_MINUTE_SECONDS))
      : DEFAULT_GENERATED_ACTIVITY_MINUTES;

    Object.entries(generatedByGoal).forEach(([goal, habits]) => {
      byGoal[goal] = [];
      habits.forEach((habit) => {
        const durationMinutes = habit.durationMinutes ?? fallbackDurationMinutes;
        const activityType =
          typeof habit.routineType === 'string'
            ? (habit.routineType.toLowerCase() as ActivityType)
            : (fallbackRoutineType as ActivityType | undefined) ?? ActivityType.morning;
        const durationSeconds = Math.max(ONE_MINUTE_SECONDS, Math.round(durationMinutes) * ONE_MINUTE_SECONDS);
        const description = habit.description ?? '';

        const generatedActivity: any = {
          id: randomUUID(),
          name: habit.name,
          text_instructions: description,
          description,
          duration_seconds: durationSeconds,
          activity_type: activityType,
          ai_generated: true,
          ai_justification: habit.justification ?? '',
          ai_match_score: null,
          ai_goals: [goal],
        };

        byGoal[goal].push(generatedActivity);
        flat.push(generatedActivity);
      });
    });

    return { byGoal, flat };
  }

  private async persistGeneratedHabits(
    userId: string | undefined,
    generatedByGoal: Record<string, GeneratedHabitSuggestion[]>,
    request: GetRoutineSuggestionsDto,
    hasGeneratedHabits: boolean,
  ): Promise<void> {
    if (!hasGeneratedHabits) {
      return;
    }
    const entries = Object.entries(generatedByGoal).flatMap(([goal, habits]) =>
      habits.map((habit) => ({
        userId: userId ?? null,
        goal,
        habitName: habit.name,
        habitDescription: habit.description ?? null,
        routineType: (habit.routineType as string | undefined) ?? request.routine ?? null,
        durationMinutes: habit.durationMinutes ?? request.routine_duration ?? DEFAULT_GENERATED_ACTIVITY_MINUTES,
        justification: habit.justification ?? null,
        requestMetadata: {
          routine: request.routine ?? null,
          routineDurationMinutes: request.routine_duration ?? null,
          groupByGoals: request.groupByGoals ?? false,
          goalCount: request.user_goals?.length ?? 0,
          source: 'rag_generation',
        },
      })),
    );

    if (!entries.length) {
      return;
    }

    try {
      await this.habitLibraryRequestRepository.logRequests(entries);
    } catch (error) {
      this.sentryService.instance().captureException(error, {
        level: 'warning',
        extra: { userId, goalCount: entries.length },
      });
    }
  }

  private buildSimilarityFallback(
    goal: string,
    candidates: { template: ActivityTemplate; similarity: number }[],
    limit: number,
    minScore: number,
  ): RoutineSuggestionResult[] {
    const normalizedLimit = Math.max(1, limit);
    return candidates
      .filter(({ similarity }) => similarity >= minScore)
      .slice(0, normalizedLimit)
      .map(({ template, similarity }) => ({
        habitId: template.id,
        name: template.activity_data?.name,
        description: template.activity_data?.text_instructions,
        justification: `Closest available habit for "${goal}" based on embedding similarity.`,
        matchScore: Number(similarity.toFixed(2)),
        template,
      }));
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
