import { Injectable, Logger, NotFoundException } from '@nestjs/common';
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
import { CreateHabitWithAiDto } from '../dto/create-habit-with-ai.dto';

const EMOJI_REGEX = /[\p{Extended_Pictographic}\p{Emoji_Presentation}\p{Emoji_Component}\uFE0F\u200D]/gu;

const MAX_ROUTINE_HABITS_PER_TYPE = 10;
const RAG_RETRIEVAL_LIMIT = 10;
const DEFAULT_GENERATED_ACTIVITY_MINUTES = 10;
const ADJUST_HABIT_MIN_SIMILARITY = 0.7;

export interface ActivityMetadata {
  justification: string;
  matchScore: number;
  goals: string[];
  name?: string;
  description?: string;
}

@Injectable()
export class ActivityLibraryService {
  private readonly logger = new Logger(ActivityLibraryService.name);

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

  async getActivitiesRelatedToUserGoals(
    getRoutineSuggestionsDto: GetRoutineSuggestionsDto,
    user_id: string,
    options?: { asyncTaskId?: string; requestHash?: string },
  ) {
    try {
      const normalizedRoutineSuggestionsDto = this.normalizeRoutineSuggestionsDto(getRoutineSuggestionsDto);
      const request = normalizedRoutineSuggestionsDto;
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'get activities related to user goals',
        data: { ...request, user_id },
      });

      this.logger.debug(
        `RoutineSuggestions:start ${JSON.stringify({
          userId: user_id,
          goalCount: request.user_goals?.length ?? 0,
          routine: request.routine,
          durationMinutes: request.routine_duration,
        })}`,
      );

      await this.validateUser(user_id);

      const routineDurationSeconds = request.routine_duration * ONE_MINUTE_SECONDS;

      const directMatches = await this.activityTemplateRepository.getActivityTemplatesWithGoalsMatched(request);
      this.logger.debug(
        `RoutineSuggestions:dbDirectMatches ${JSON.stringify({
          userId: user_id,
          goals: request.user_goals,
          directMatchCount: directMatches.length,
        })}`,
      );
      const orderedMatches = directMatches.sort(
        (activityTemplateA, activityTemplateB) =>
          activityTemplateA.duration_seconds - activityTemplateB.duration_seconds,
      );
      const directTemplates = this.userDesiredRoutineDurationSeconds(orderedMatches, routineDurationSeconds);

      if (directTemplates.length) {
        this.logger.debug(
          `RoutineSuggestions:directMatches ${JSON.stringify({
            userId: user_id,
            goals: request.user_goals,
            templateCount: directTemplates.length,
          })}`,
        );
        if (request.groupByGoals) {
          const groupedByGoal: Record<string, ActivityTemplate[]> = {};
          for (const goal of request.user_goals ?? []) {
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

      const ragResult = await this.getActivitiesFromRag(request, routineDurationSeconds, user_id, options);

      this.logger.debug(
        `RoutineSuggestions:ragComplete ${JSON.stringify({
          userId: user_id,
          goals: request.user_goals,
          templateCount: ragResult.templates.length,
          generatedCount: ragResult.groupedByGoal
            ? Object.values(ragResult.groupedByGoal).reduce((acc, list) => acc + (list?.length ?? 0), 0)
            : ragResult.templates.length,
        })}`,
      );
      if (request.groupByGoals) {
        return ragResult.groupedByGoal ?? {};
      }
      return ragResult.templates;
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  private normalizeRoutineSuggestionsDto(dto: GetRoutineSuggestionsDto): GetRoutineSuggestionsDto {
    const normalizedGoals = this.normalizeUserGoals(dto.user_goals);
    return {
      ...dto,
      user_goals: normalizedGoals,
    };
  }

  private normalizeUserGoals(userGoals?: string[]): string[] {
    if (!userGoals?.length) {
      return [];
    }

    return userGoals.map((goal) => this.normalizeGoal(goal)).filter((goal) => goal.length > 0);
  }

  private normalizeGoal(goal: string): string {
    if (!goal) {
      return '';
    }
    const withoutEmojis = goal.replace(EMOJI_REGEX, '');
    return withoutEmojis.replace(/\s+/g, ' ').trim();
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
    metadataMap: Map<string, ActivityMetadata> = new Map(),
  ) {
    const routineLength = {
      [ActivityType.morning]: 0,
      [ActivityType.evening]: 0,
      [ActivityType.break]: 0,
      [ActivityType.library]: 0,
    };
    const allValidActivities = [];
    const routineDuration = {
      [ActivityType.morning]: 0,
      [ActivityType.evening]: 0,
      [ActivityType.break]: 0,
      [ActivityType.library]: 0,
    }; // @Description: unit of duration is seconds

    // Sort by match score (highest first), then by duration (shortest first)
    const sortedTemplates = activityTemplates
      .filter(
        (template) =>
          template.activity_type === ActivityType.morning ||
          template.activity_type === ActivityType.evening ||
          template.activity_type === ActivityType.break ||
          template.activity_type === ActivityType.library,
      )
      .sort((a, b) => {
        const aMetadata = metadataMap.get(a.id);
        const bMetadata = metadataMap.get(b.id);
        const aScore = aMetadata?.matchScore ?? 0;
        const bScore = bMetadata?.matchScore ?? 0;

        // Sort by match score descending, then by duration ascending
        if (bScore !== aScore) {
          return bScore - aScore;
        }
        return a.duration_seconds - b.duration_seconds;
      });

    sortedTemplates.some((activityTemplate) => {
      const template_duration = parseInt(activityTemplate.duration_seconds?.toString(), 10);
      const activityType = activityTemplate.activity_type;

      // Stop if we've reached max habits across all types
      const totalHabits =
        routineLength[ActivityType.morning] +
        routineLength[ActivityType.evening] +
        routineLength[ActivityType.break] +
        routineLength[ActivityType.library];
      if (totalHabits >= MAX_ROUTINE_HABITS_PER_TYPE * 4) {
        return true;
      }

      // Enforce per-type caps so break/library cannot crowd out morning/evening
      if (routineLength[activityType] >= MAX_ROUTINE_HABITS_PER_TYPE) {
        return false;
      }

      // For morning/evening: also respect duration budget
      const isValidDuration = this.isValidTemplateDuration(
        template_duration,
        routineDuration[activityType],
        userRoutineDurationSeconds,
      );
      if (isValidDuration || activityType === ActivityType.break || activityType === ActivityType.library) {
        routineDuration[activityType] += template_duration;
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
    options?: { asyncTaskId?: string; requestHash?: string },
  ): Promise<{ templates: ActivityTemplate[]; groupedByGoal?: Record<string, ActivityTemplate[]> }> {
    // RAG flow documented in docs/rag-routine-suggestions-flow.md
    const request = getRoutineSuggestionsDto;
    const goals = request.user_goals ?? [];
    if (!goals.length) {
      return { templates: [], groupedByGoal: {} };
    }

    const goalResults = await Promise.all(
      goals.map(async (goal) => {
        const generationOptions = {
          limit: RAG_RETRIEVAL_LIMIT,
          routineType: request.routine,
          routineDurationSeconds,
        };
        try {
          const matches = await this.activityTemplateRetrieverService.retrieveByGoal(goal, RAG_RETRIEVAL_LIMIT);
          if (!matches.length) {
            const generated = await this.routineSuggestionGeneratorService.generateNewHabits(goal, generationOptions);
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
            const generated = await this.routineSuggestionGeneratorService.generateNewHabits(goal, generationOptions);
            return { goal, suggestions: [] as RoutineSuggestionResult[], generated };
          }

          const suggestionResult = await this.routineSuggestionGeneratorService.generateSuggestions(goal, candidates, {
            limit: generationOptions.limit,
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
          const generated = await this.routineSuggestionGeneratorService.generateNewHabits(goal, generationOptions);
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
            generationOptions.limit ?? RAG_RETRIEVAL_LIMIT,
            suggestionResult.minScoreApplied,
          );
          if (similarityFallback.length) {
            // Last-resort: if the LLM rejected everything or errored, surface top embedding matches with a disclaimer
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

    const metadataAccumulator = new Map<string, ActivityMetadata>();
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

    this.logger.debug(
      `RoutineSuggestions:beforeDurationFilter ${JSON.stringify({
        totalTemplates: aggregatedTemplates.length,
        byType: aggregatedTemplates.reduce((acc, t) => {
          acc[t.activity_type] = (acc[t.activity_type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        templates: aggregatedTemplates.map((t) => ({
          id: t.id,
          name: t.activity_data?.name,
          type: t.activity_type,
          durationSeconds: t.duration_seconds,
        })),
      })}`,
    );

    const finalTemplates = this.userDesiredRoutineDurationSeconds(
      aggregatedTemplates,
      routineDurationSeconds,
      metadataAccumulator,
    );

    this.logger.debug(
      `RoutineSuggestions:afterDurationFilter ${JSON.stringify({
        finalCount: finalTemplates.length,
        routineDurationSeconds,
        templates: finalTemplates.map((t: any) => ({
          name: t.name,
          type: t.activity_type,
          durationSeconds: t.duration_seconds,
        })),
      })}`,
    );

    const generatedActivities = this.buildGeneratedActivities(generatedByGoal, routineDurationSeconds, request.routine);

    await this.persistGeneratedHabits(userId, generatedByGoal, request, generatedActivities.flat.length > 0, options);

    const templatesByOriginalId = new Map(
      finalTemplates
        .filter((template: any) => template.original_template_id)
        .map((template: any) => [template.original_template_id as string, template]),
    );

    let groupedByGoal: Record<string, ActivityTemplate[]> | undefined;
    if (request.groupByGoals) {
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
    options?: { asyncTaskId?: string; requestHash?: string },
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
          asyncTaskId: options?.asyncTaskId ?? null,
          requestHash: options?.requestHash ?? null,
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

      const overrides = await this.buildLibraryOverridesForHabits(
        adjustHabitsWithAiDto.current_habits,
        adjustHabitsWithAiDto.user_feedback,
      );

      const adjustedHabits = await this.openAIService.adjustHabitsWithAi(
        adjustHabitsWithAiDto.current_habits,
        adjustHabitsWithAiDto.user_feedback,
        adjustHabitsWithAiDto.user_goals,
        adjustHabitsWithAiDto.routine_duration,
        adjustHabitsWithAiDto.groupByGoals,
      );

      const resolved = this.applyLibraryOverridesToAdjustedHabits(adjustedHabits, overrides);

      await this.logAdjustedGeneratedHabits(resolved, user_id, adjustHabitsWithAiDto);

      return resolved;
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async createHabitWithAi(createHabitWithAiDto: CreateHabitWithAiDto, user_id: string) {
    const goals = this.normalizeUserGoals(
      createHabitWithAiDto.user_goals?.length ? createHabitWithAiDto.user_goals : [createHabitWithAiDto.prompt],
    );
    const routineDuration = createHabitWithAiDto.routine_duration ?? DEFAULT_GENERATED_ACTIVITY_MINUTES;
    const request: GetRoutineSuggestionsDto = {
      user_goals: goals,
      routine_duration: routineDuration,
      routine: createHabitWithAiDto.routine,
      groupByGoals: false,
    };
    const routineDurationSeconds = routineDuration * ONE_MINUTE_SECONDS;
    const ragResult = await this.getActivitiesFromRag(request, routineDurationSeconds, user_id, {
      requestHash: null,
    });

    // Prioritize library / non-generated habits first
    const libraryFirst = [
      ...ragResult.templates.filter((t: any) => !t.ai_generated),
      ...ragResult.templates.filter((t: any) => t.ai_generated),
    ];
    return libraryFirst;
  }

  private async buildLibraryOverridesForHabits(currentHabits: any[], userFeedback?: string) {
    const overrides = new Map<
      string,
      { templateId: string; activityData: any; justification: string; similarity: number }
    >();
    const habits = Array.isArray(currentHabits) ? currentHabits : [];

    const overrideEntries = await Promise.all(
      habits.map(async (habit) => {
        const query = [habit?.name, userFeedback].filter(Boolean).join(' - ').trim();
        if (!query) {
          return null;
        }

        const matches = await this.activityTemplateRetrieverService.retrieveByText(query, 3);
        const [top] = matches;
        if (!top || top.similarity < ADJUST_HABIT_MIN_SIMILARITY) {
          return null;
        }

        const template = await this.activityTemplateRepository.orm.findOne({
          where: { id: top.activityTemplateId },
        });
        if (!template?.activity_data) {
          return null;
        }

        return {
          habitId: String(habit.id),
          templateId: template.id,
          activityData: template.activity_data,
          justification: `Reused assets from library habit "${template.activity_data?.name ?? ''}"`,
          similarity: top.similarity,
        };
      }),
    );

    overrideEntries
      .filter(
        (
          entry,
        ): entry is {
          habitId: string;
          templateId: string;
          activityData: any;
          justification: string;
          similarity: number;
        } => !!entry,
      )
      .forEach((entry) => {
        overrides.set(entry.habitId, {
          templateId: entry.templateId,
          activityData: entry.activityData,
          justification: entry.justification,
          similarity: entry.similarity,
        });
      });

    return overrides;
  }

  private applyLibraryOverridesToAdjustedHabits(
    adjustedHabits: any,
    overrides: Map<string, { templateId: string; activityData: any; justification: string; similarity: number }>,
  ) {
    if (!overrides.size) {
      return adjustedHabits;
    }

    const applyOverride = (habit: any) => {
      const override = overrides.get(String(habit?.id));
      if (!override) {
        return habit;
      }
      const data = override.activityData;
      const patched = {
        ...habit,
        original_template_id: override.templateId,
      };
      if (data?.video_urls?.length) patched.video_urls = data.video_urls;
      if (data?.image_urls?.length) patched.image_urls = data.image_urls;
      if (data?.allowed_urls?.length) patched.allowed_urls = data.allowed_urls;
      if (data?.text_instructions) {
        patched.text_instructions = data.text_instructions;
        patched.description = patched.description ?? data.text_instructions;
      }
      if (data?.habit_icon && !patched.habit_icon) {
        patched.habit_icon = data.habit_icon;
      }
      patched.ai_generated = false;
      if (patched.ai_justification) {
        patched.ai_justification = `${patched.ai_justification} ${override.justification}`.trim();
      } else {
        patched.ai_justification = override.justification;
      }
      if (typeof patched.ai_match_score !== 'number') {
        patched.ai_match_score = Number(override.similarity.toFixed(2));
      }
      return patched;
    };

    if (Array.isArray(adjustedHabits)) {
      return adjustedHabits.map(applyOverride);
    }

    if (adjustedHabits && typeof adjustedHabits === 'object') {
      const result: Record<string, any[]> = {};
      for (const [goal, habits] of Object.entries(adjustedHabits)) {
        result[goal] = Array.isArray(habits) ? habits.map(applyOverride) : [];
      }
      return result;
    }

    return adjustedHabits;
  }

  private async logAdjustedGeneratedHabits(
    adjustedHabits: any,
    userId: string,
    request: AdjustHabitsWithAiDto,
  ): Promise<void> {
    const entries: any[] = [];
    const pushEntry = (habit: any) => {
      if (!habit || (!habit.ai_generated && habit.original_template_id)) {
        return;
      }
      entries.push({
        userId,
        goal: (request.user_goals ?? [])[0] ?? 'habit_adjustment',
        habitName: habit.name ?? '',
        habitDescription: habit.description ?? habit.text_instructions ?? null,
        routineType: habit.activity_type ?? request.groupByGoals ? null : request.routine_duration ?? null,
        durationMinutes:
          typeof habit.duration_seconds === 'number'
            ? Math.max(1, Math.round(habit.duration_seconds / ONE_MINUTE_SECONDS))
            : request.routine_duration ?? DEFAULT_GENERATED_ACTIVITY_MINUTES,
        justification: habit.ai_justification ?? null,
        requestMetadata: {
          source: 'habit_adjustment',
          userFeedback: request.user_feedback ?? '',
          goalCount: request.user_goals?.length ?? 0,
          groupByGoals: request.groupByGoals ?? false,
        },
      });
    };

    if (Array.isArray(adjustedHabits)) {
      adjustedHabits.forEach(pushEntry);
    } else if (adjustedHabits && typeof adjustedHabits === 'object') {
      Object.values(adjustedHabits).forEach((list: any) => {
        if (Array.isArray(list)) {
          list.forEach(pushEntry);
        }
      });
    }

    if (!entries.length) {
      return;
    }

    try {
      await this.habitLibraryRequestRepository.logRequests(entries);
    } catch (error) {
      this.sentryService.instance().captureException(error, {
        level: 'warning',
        extra: { userId, entryCount: entries.length },
      });
    }
  }
}
