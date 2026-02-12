import { Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import { InjectSentry, SentryService, emitAiPipelineMetrics } from '@app/observability';
import { ConfigService } from '@nestjs/config';
import { In } from 'typeorm';
import { randomUUID } from 'crypto';
import { UpdateActivityDto } from '../../activity/dto/update-activity.dto';
import { UserRepository } from '../../user/repositories/user.repository';
import { UpdateActivityTemplateDto } from '../dto/activity-template.dto';
import { ActivityTemplateRepository } from '../repository/activity-template.repository';
import { ActivityTemplateParserService } from './activity-template-parser.service';
import { ActivityRepository } from '../../activity/repositories/activity.repository';
import { ActivityType } from '../../activity/domain/activity-type.enum';
import { GetRoutineSuggestionsDto, GetRoutineSuggestionsInput } from '../dto/get-routine-suggestions.dto';
import { UserGoalDto, UserGoalInput } from '../dto/user-goal.dto';
import { ActivityTemplate } from '../entity/activity-template.entity';
import { ONE_MINUTE_SECONDS } from '../../../shared/utils/constants';
import { OpenAIService } from '../../../../../../libs/openai/src/openai.service';
import { AdjustHabitsWithAiDto } from '../dto/adjust-habits-with-ai.dto';
import { ActivityTemplateRetrieverService } from './activity-template-retriever.service';
import {
  RoutineSuggestionGeneratorService,
  RoutineSuggestionResult,
  GeneratedHabitSuggestion,
  GenerateSuggestionsResponse,
} from './routine-suggestion-generator.service';
import { HabitLibraryRequestRepository } from '../repository/habit-library-request.repository';
import { CreateHabitWithAiDto } from '../dto/create-habit-with-ai.dto';
import { MetricsConfig } from '../../../config/metrics.config';

const EMOJI_REGEX = /[\p{Extended_Pictographic}\p{Emoji_Presentation}\p{Emoji_Component}\uFE0F\u200D]/gu;

const MAX_ROUTINE_HABITS_PER_TYPE = 10;
const RAG_RETRIEVAL_LIMIT = 10;
const RAG_RETRIEVAL_DURATION_MULTIPLIER = 2;
const DEFAULT_GENERATED_ACTIVITY_MINUTES = 10;
const ADJUST_HABIT_MIN_SIMILARITY = 0.7;

type RoutineSuggestionRequestOptions = {
  asyncTaskId?: string;
  requestHash?: string;
  useRag?: boolean;
};

type RagRequestOptions = Omit<RoutineSuggestionRequestOptions, 'useRag'>;

export interface ActivityMetadata {
  justification: string;
  matchScore: number;
  goals: string[];
  isFromCustomGoal: boolean;
  name?: string;
  description?: string;
}

type NormalizedGoalEntry = { goal: string; isCustom: boolean };
type NormalizedGoals = {
  goalEntries: NormalizedGoalEntry[];
  goalStrings: string[];
  hasCustomGoals: boolean;
  customGoalStrings: string[];
  predefinedGoalStrings: string[];
};

type RoutineSuggestionsStageDurations = {
  validateUserMs: number;
  directMatchQueryMs: number;
  ragRetrieveMs: number;
  ragRerankMs: number;
  ragGenerateMs: number;
  durationFilterMs: number;
  persistGeneratedMs: number;
  totalMs: number;
};

type RoutineSuggestionsCounters = {
  directMatchCount: number;
  ragGoalCount: number;
  ragTemplateCandidates: number;
  rerankLlmCalls: number;
  rerankShortcutAccepts: number;
  rerankShortcutRejects: number;
  acceptedTemplateCount: number;
  generatedHabitCount: number;
};

type RoutineSuggestionsPipelineTelemetry = {
  stageDurations: RoutineSuggestionsStageDurations;
  counters: RoutineSuggestionsCounters;
};

type RoutineSuggestionsMetricsContext = {
  userId: string;
  asyncTaskId?: string;
  requestHash?: string | null;
};

const ROUTINE_SUGGESTIONS_PIPELINE = 'routine-suggestions';
const ROUTINE_SUGGESTIONS_OPERATION = 'getActivitiesRelatedToUserGoals';

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
    @Optional() private readonly configService?: ConfigService,
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
    getRoutineSuggestionsDto: GetRoutineSuggestionsInput,
    user_id: string,
    options?: RoutineSuggestionRequestOptions,
  ) {
    const pipelineStartedAt = Date.now();
    const telemetry = this.createEmptyRoutineSuggestionsTelemetry();
    let success = false;
    let processingError: Error | undefined;

    try {
      const { useRag = true, ...ragOptions } = options ?? {};
      const normalizedRoutineSuggestionsDto = this.normalizeRoutineSuggestionsDto(getRoutineSuggestionsDto);
      const request = normalizedRoutineSuggestionsDto;
      const normalizedGoals = this.normalizeGoalsWithMetadata(request.user_goals);
      telemetry.counters.ragGoalCount = normalizedGoals.goalStrings.length;
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'get activities related to user goals',
        data: { ...request, user_id },
      });

      this.logger.debug(
        `RoutineSuggestions:start ${JSON.stringify({
          userId: user_id,
          goalCount: normalizedGoals.goalStrings.length,
          routine: request.routine,
          durationMinutes: request.routine_duration,
        })}`,
      );

      const validateUserStartedAt = Date.now();
      await this.validateUser(user_id);
      telemetry.stageDurations.validateUserMs += Date.now() - validateUserStartedAt;

      const routineDurationSeconds = request.routine_duration * ONE_MINUTE_SECONDS;

      const directMatchQueryStartedAt = Date.now();
      const directMatches = await this.activityTemplateRepository.getActivityTemplatesWithGoalsMatched({
        routine_duration: request.routine_duration,
        routine: request.routine,
        user_goals: normalizedGoals.goalStrings,
      });
      telemetry.stageDurations.directMatchQueryMs += Date.now() - directMatchQueryStartedAt;
      telemetry.counters.directMatchCount = directMatches.length;
      this.logger.debug(
        `RoutineSuggestions:dbDirectMatches ${JSON.stringify({
          userId: user_id,
          goals: normalizedGoals.goalStrings,
          directMatchCount: directMatches.length,
        })}`,
      );
      const orderedMatches = directMatches.sort(
        (activityTemplateA, activityTemplateB) =>
          activityTemplateA.duration_seconds - activityTemplateB.duration_seconds,
      );
      const { metadata: directMatchMetadata, matchedCustomGoalLowerSet } = this.buildDirectMatchMetadata(
        orderedMatches,
        normalizedGoals,
      );
      const directDurationFilterStartedAt = Date.now();
      const directTemplates = this.userDesiredRoutineDurationSeconds(
        orderedMatches,
        routineDurationSeconds,
        directMatchMetadata,
      );
      telemetry.stageDurations.durationFilterMs += Date.now() - directDurationFilterStartedAt;

      const customGoalsWithoutMatches = normalizedGoals.customGoalStrings.filter(
        (goal) => !matchedCustomGoalLowerSet.has(goal.toLowerCase()),
      );

      if (directTemplates.length && (!normalizedGoals.hasCustomGoals || customGoalsWithoutMatches.length === 0)) {
        this.logger.debug(
          `RoutineSuggestions:directMatches ${JSON.stringify({
            userId: user_id,
            goals: normalizedGoals.goalStrings,
            templateCount: directTemplates.length,
          })}`,
        );
        if (request.groupByGoals) {
          const groupedByGoal: Record<string, ActivityTemplate[]> = {};
          for (const { goal } of normalizedGoals.goalEntries) {
            groupedByGoal[goal] = directTemplates
              .filter((template: ActivityTemplate) => template.tags?.some((tag) => tag.tags.includes(goal)))
              .map((template) => ({
                ...template,
                tags: template.tags?.flatMap((tag) => tag.tags) ?? [],
              }));
          }
          telemetry.counters.acceptedTemplateCount = directTemplates.length;
          success = true;
          return groupedByGoal;
        }
        telemetry.counters.acceptedTemplateCount = directTemplates.length;
        success = true;
        return directTemplates;
      }

      // If we found matching templates but none fit the user's time budget, respect the duration contract
      if (!useRag) {
        this.logger.debug(
          `RoutineSuggestions:ragSkipped ${JSON.stringify({
            userId: user_id,
            goalCount: normalizedGoals.goalStrings.length,
            routine: request.routine,
            durationMinutes: request.routine_duration,
          })}`,
        );
        success = true;
        return request.groupByGoals ? {} : [];
      }

      const ragResult = await this.getActivitiesFromRag(
        request,
        routineDurationSeconds,
        user_id,
        ragOptions,
        {
          templates: orderedMatches,
          metadata: directMatchMetadata,
        },
        telemetry,
      );
      telemetry.counters.acceptedTemplateCount = ragResult.templates.filter(
        (template: any) => !template.ai_generated,
      ).length;
      telemetry.counters.generatedHabitCount = ragResult.templates.filter(
        (template: any) => template.ai_generated,
      ).length;

      this.logger.debug(
        `RoutineSuggestions:ragComplete ${JSON.stringify({
          userId: user_id,
          goals: normalizedGoals.goalStrings,
          templateCount: ragResult.templates.length,
          generatedCount: ragResult.groupedByGoal
            ? Object.values(ragResult.groupedByGoal).reduce((acc, list) => acc + (list?.length ?? 0), 0)
            : ragResult.templates.length,
        })}`,
      );
      if (request.groupByGoals) {
        success = true;
        return ragResult.groupedByGoal ?? {};
      }
      success = true;
      return ragResult.templates;
    } catch (error) {
      processingError = error instanceof Error ? error : new Error(String(error));
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    } finally {
      telemetry.stageDurations.totalMs = Date.now() - pipelineStartedAt;
      await this.emitRoutineSuggestionsTelemetry({
        success,
        stageDurations: telemetry.stageDurations,
        counters: telemetry.counters,
        context: {
          userId: user_id,
          asyncTaskId: options?.asyncTaskId,
          requestHash: options?.requestHash,
        },
        error: processingError,
      });
    }
  }

  private normalizeRoutineSuggestionsDto(dto: GetRoutineSuggestionsInput): GetRoutineSuggestionsDto {
    const normalizedGoals = this.normalizeUserGoals(dto.user_goals);
    return {
      ...dto,
      user_goals: normalizedGoals,
    };
  }

  private normalizeUserGoals(userGoals?: UserGoalInput[]): UserGoalDto[] {
    if (!userGoals?.length) {
      return [];
    }

    // The API is backward compatible: older clients send `string[]`, newer clients send `{ goal, isCustom }[]`.
    // This normalizer converts both shapes into the internal `{ goal, isCustom }[]` representation.
    return userGoals
      .map((goal) => {
        if (typeof goal === 'string') {
          return { goal: this.normalizeGoal(goal), isCustom: false };
        }
        return { goal: this.normalizeGoal(goal.goal), isCustom: goal.isCustom ?? false };
      })
      .filter((goal) => goal.goal.length > 0);
  }

  private normalizeGoal(goal: string): string {
    if (!goal) {
      return '';
    }
    const withoutEmojis = goal.replace(EMOJI_REGEX, '');
    return withoutEmojis.replace(/\s+/g, ' ').trim();
  }

  /**
   * Produces a "dual" representation of goals:
   * - `goalEntries`: keeps `isCustom` and is sorted custom-first (for deterministic priority).
   * - `goalStrings`: plain strings for legacy consumers (DB tag match, embedding calls, etc).
   *
   * We keep this helper local to the service so the rest of the pipeline can treat goals consistently.
   */
  private normalizeGoalsWithMetadata(userGoals?: UserGoalInput[]): NormalizedGoals {
    const entries = this.normalizeUserGoals(userGoals).map((entry) => ({
      goal: entry.goal,
      isCustom: entry.isCustom ?? false,
    }));

    const sorted = [...entries].sort((a, b) => {
      if (a.isCustom && !b.isCustom) return -1;
      if (!a.isCustom && b.isCustom) return 1;
      return 0;
    });

    const customGoalStrings = sorted.filter((entry) => entry.isCustom).map((entry) => entry.goal);
    const predefinedGoalStrings = sorted.filter((entry) => !entry.isCustom).map((entry) => entry.goal);

    return {
      goalEntries: sorted,
      goalStrings: sorted.map((entry) => entry.goal),
      hasCustomGoals: customGoalStrings.length > 0,
      customGoalStrings,
      predefinedGoalStrings,
    };
  }

  /**
   * Direct tag-matches are "high confidence" and should always be eligible, but we still need to know whether
   * a direct match is supporting a custom goal vs a predefined goal so we can keep ordering deterministic.
   *
   * This builds a metadata map for the direct-match templates and also tracks which custom goals were actually matched.
   */
  private buildDirectMatchMetadata(
    templates: ActivityTemplate[],
    normalizedGoals: NormalizedGoals,
  ): { metadata: Map<string, ActivityMetadata>; matchedCustomGoalLowerSet: Set<string> } {
    const customGoalMap = new Map(normalizedGoals.customGoalStrings.map((goal) => [goal.toLowerCase(), goal]));
    const predefinedGoalMap = new Map(normalizedGoals.predefinedGoalStrings.map((goal) => [goal.toLowerCase(), goal]));
    const matchedCustomGoalLowerSet = new Set<string>();
    const metadata = new Map<string, ActivityMetadata>();

    templates.forEach((template) => {
      const matchedGoals: string[] = [];
      let matchedCustom = false;

      template.tags?.forEach((tagEntity) => {
        tagEntity.tags.forEach((tag) => {
          const tagLower = tag.toLowerCase();
          const canonicalCustom = customGoalMap.get(tagLower);
          if (canonicalCustom) {
            matchedCustom = true;
            matchedCustomGoalLowerSet.add(tagLower);
            matchedGoals.push(canonicalCustom);
            return;
          }
          const canonicalPredefined = predefinedGoalMap.get(tagLower);
          if (canonicalPredefined) {
            matchedGoals.push(canonicalPredefined);
          }
        });
      });

      metadata.set(template.id, {
        isFromCustomGoal: matchedCustom,
        matchScore: 1,
        goals: matchedGoals,
        justification: '',
      });
    });

    return { metadata, matchedCustomGoalLowerSet };
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

    // We want deterministic priority:
    // 1) habits supporting custom goals
    // 2) habits supporting predefined goals
    //
    // Within each bucket we keep the existing ranking (higher matchScore first, then shorter duration).
    const customTemplates = activityTemplates.filter((template) => metadataMap.get(template.id)?.isFromCustomGoal);
    const predefinedTemplates = activityTemplates.filter((template) => !metadataMap.get(template.id)?.isFromCustomGoal);
    const sortByScoreThenDuration = (templates: ActivityTemplate[]) =>
      templates
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

          if (bScore !== aScore) {
            return bScore - aScore;
          }
          return a.duration_seconds - b.duration_seconds;
        });

    // Custom-first: sort each partition by match score then duration, then concatenate.
    const sortedTemplates = [
      ...sortByScoreThenDuration(customTemplates),
      ...sortByScoreThenDuration(predefinedTemplates),
    ];

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

      // Respect the user's duration budget for all activity types
      const isValidDuration = this.isValidTemplateDuration(
        template_duration,
        routineDuration[activityType],
        userRoutineDurationSeconds,
      );
      if (!isValidDuration) {
        return false;
      }

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
      return false;
    });
    return allValidActivities;
  }

  private async getActivitiesFromRag(
    getRoutineSuggestionsDto: GetRoutineSuggestionsDto,
    routineDurationSeconds: number,
    userId?: string,
    options?: RagRequestOptions,
    seed?: { templates: ActivityTemplate[]; metadata: Map<string, ActivityMetadata> },
    telemetry: RoutineSuggestionsPipelineTelemetry = this.createEmptyRoutineSuggestionsTelemetry(),
  ): Promise<{ templates: ActivityTemplate[]; groupedByGoal?: Record<string, ActivityTemplate[]> }> {
    // RAG flow documented in docs/rag-routine-suggestions-flow.md
    const request = getRoutineSuggestionsDto;
    const normalizedGoals = this.normalizeGoalsWithMetadata(request.user_goals);
    const goals = normalizedGoals.goalEntries;
    const { stageDurations } = telemetry;
    const { counters } = telemetry;
    if (!goals.length) {
      return { templates: [], groupedByGoal: {} };
    }

    const goalResults = await Promise.all(
      goals.map(async ({ goal, isCustom }) => {
        const generationOptions = {
          limit: RAG_RETRIEVAL_LIMIT,
          routineType: request.routine,
          routineDurationSeconds,
        };
        try {
          const retrievalLimit =
            routineDurationSeconds && routineDurationSeconds > 0
              ? RAG_RETRIEVAL_LIMIT * RAG_RETRIEVAL_DURATION_MULTIPLIER
              : RAG_RETRIEVAL_LIMIT;

          const retrieveStartedAt = Date.now();
          const matches = await this.activityTemplateRetrieverService.retrieveByGoal(goal, retrievalLimit, {
            routineType: request.routine,
          });
          stageDurations.ragRetrieveMs += Date.now() - retrieveStartedAt;
          counters.ragTemplateCandidates += matches.length;
          if (!matches.length) {
            const generated = await this.generateHabitsWithTiming(goal, generationOptions, telemetry);
            return { goal, isCustom, suggestions: [] as RoutineSuggestionResult[], generated };
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
            const generated = await this.generateHabitsWithTiming(goal, generationOptions, telemetry);
            return { goal, isCustom, suggestions: [] as RoutineSuggestionResult[], generated };
          }

          const durationFilteredCandidates =
            routineDurationSeconds && routineDurationSeconds > 0
              ? candidates.filter(({ template }) => Number(template.duration_seconds ?? 0) <= routineDurationSeconds)
              : candidates;

          if (!durationFilteredCandidates.length) {
            const generated = await this.generateHabitsWithTiming(goal, generationOptions, telemetry);
            return { goal, isCustom, suggestions: [] as RoutineSuggestionResult[], generated };
          }

          const rerankStartedAt = Date.now();
          const suggestionResult = await this.routineSuggestionGeneratorService.generateSuggestions(
            goal,
            durationFilteredCandidates,
            {
              limit: generationOptions.limit,
              includeTelemetry: true,
            },
          );
          stageDurations.ragRerankMs += Date.now() - rerankStartedAt;
          this.recordRerankCounters(suggestionResult, telemetry);
          if (suggestionResult.accepted.length) {
            const acceptedDurationSeconds = suggestionResult.accepted.reduce(
              (total, suggestion) => total + Number(suggestion.template?.duration_seconds ?? 0),
              0,
            );

            if (acceptedDurationSeconds >= (generationOptions.routineDurationSeconds ?? 0)) {
              return {
                goal,
                isCustom,
                suggestions: suggestionResult.accepted,
                generated: [] as GeneratedHabitSuggestion[],
              };
            }

            const remainingSeconds = Math.max(
              ONE_MINUTE_SECONDS,
              (generationOptions.routineDurationSeconds ?? ONE_MINUTE_SECONDS) - acceptedDurationSeconds,
            );
            const remainingSlots = Math.max(
              0,
              (generationOptions.limit ?? RAG_RETRIEVAL_LIMIT) - suggestionResult.accepted.length,
            );
            const generated = remainingSlots
              ? await this.generateHabitsWithTiming(
                  goal,
                  {
                    ...generationOptions,
                    routineDurationSeconds: remainingSeconds,
                    limit: remainingSlots,
                  },
                  telemetry,
                )
              : [];

            return { goal, isCustom, suggestions: suggestionResult.accepted, generated };
          }

          this.sentryService.instance().addBreadcrumb({
            category: 'RoutineSuggestion',
            level: 'info',
            message: 'Falling back to generated habits',
            data: {
              goal,
              candidateCount: durationFilteredCandidates.length,
              rejectedCount: suggestionResult.rejectedCount,
            },
          });
          const generated = await this.generateHabitsWithTiming(goal, generationOptions, telemetry);
          if (generated.length) {
            return { goal, isCustom, suggestions: [] as RoutineSuggestionResult[], generated };
          }

          this.sentryService.instance().captureMessage('RoutineSuggestion: generated habits fallback returned empty', {
            level: 'warning',
            extra: {
              goal,
              candidateCount: durationFilteredCandidates.length,
              rejectedCount: suggestionResult.rejectedCount,
            },
          });

          const similarityFallback = this.buildSimilarityFallback(
            goal,
            durationFilteredCandidates,
            generationOptions.limit ?? RAG_RETRIEVAL_LIMIT,
            suggestionResult.minScoreApplied,
          );
          if (similarityFallback.length) {
            // Last-resort: if the LLM rejected everything or errored, surface top embedding matches with a disclaimer
            return {
              goal,
              isCustom,
              suggestions: similarityFallback,
              generated: [] as GeneratedHabitSuggestion[],
            };
          }

          return {
            goal,
            isCustom,
            suggestions: [] as RoutineSuggestionResult[],
            generated: [] as GeneratedHabitSuggestion[],
          };
        } catch (error) {
          this.sentryService.instance().captureException(error, {
            level: 'error',
            extra: { goal },
          });
          return {
            goal,
            isCustom,
            suggestions: [] as RoutineSuggestionResult[],
            generated: [] as GeneratedHabitSuggestion[],
          };
        }
      }),
    );

    const metadataAccumulator = new Map<string, ActivityMetadata>();
    const templatesAccumulator = new Map<string, ActivityTemplate>();
    const generatedByGoal: Record<string, GeneratedHabitSuggestion[]> = {};

    goalResults.forEach(({ goal, isCustom, suggestions, generated }) => {
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
          existing.isFromCustomGoal = existing.isFromCustomGoal || isCustom;
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
            isFromCustomGoal: isCustom,
            name: suggestionName,
            description: suggestionDescription,
          });
        }
      });
    });

    if (seed?.templates?.length) {
      // Seed = direct tag matches from the "fast path".
      // We merge them into the same accumulator so the duration/type selection step can apply custom-first ordering
      // across both direct matches and RAG suggestions.
      seed.templates.forEach((template) => {
        templatesAccumulator.set(template.id, template);
        const seedMetadata = seed.metadata.get(template.id);
        if (!seedMetadata) {
          return;
        }
        const existing = metadataAccumulator.get(template.id);
        if (!existing) {
          metadataAccumulator.set(template.id, seedMetadata);
          return;
        }
        existing.matchScore = Math.max(existing.matchScore, seedMetadata.matchScore);
        existing.justification = [existing.justification, seedMetadata.justification].filter(Boolean).join(' ').trim();
        existing.goals = Array.from(new Set([...(existing.goals ?? []), ...(seedMetadata.goals ?? [])]));
        existing.isFromCustomGoal = existing.isFromCustomGoal || seedMetadata.isFromCustomGoal;
      });
    }

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

    const durationFilterStartedAt = Date.now();
    const finalTemplates = this.userDesiredRoutineDurationSeconds(
      aggregatedTemplates,
      routineDurationSeconds,
      metadataAccumulator,
    );
    stageDurations.durationFilterMs += Date.now() - durationFilterStartedAt;

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

    // If duration filtering removed all suggestions, generate habits so the response is not empty
    if (!finalTemplates.length) {
      const goalsNeedingGeneration = normalizedGoals.goalStrings.filter(
        (goal) => (generatedByGoal[goal]?.length ?? 0) === 0,
      );
      const generatedResults = await Promise.all(
        goalsNeedingGeneration.map((goal) =>
          this.generateHabitsWithTiming(
            goal,
            {
              limit: RAG_RETRIEVAL_LIMIT,
              routineDurationSeconds,
              routineType: request.routine,
            },
            telemetry,
          ),
        ),
      );
      goalsNeedingGeneration.forEach((goal, index) => {
        const generated = generatedResults[index] ?? [];
        if (generated.length) {
          generatedByGoal[goal] = generated;
        }
      });
    }

    const generatedActivities = this.buildGeneratedActivities(generatedByGoal, routineDurationSeconds, request.routine);

    const persistGeneratedStartedAt = Date.now();
    await this.persistGeneratedHabits(userId, generatedByGoal, request, generatedActivities.flat.length > 0, options);
    stageDurations.persistGeneratedMs += Date.now() - persistGeneratedStartedAt;

    let combinedTemplates = [...finalTemplates, ...generatedActivities.flat];
    if (normalizedGoals.hasCustomGoals) {
      // Final guardrail: ensure custom-goal habits appear first in the flat list even after generation/merging.
      // We do this based on the ai_goals field (which we populate for both library matches and generated habits).
      const customGoalLowerSet = new Set(normalizedGoals.customGoalStrings.map((goal) => goal.toLowerCase()));
      const customFirst: ActivityTemplate[] = [];
      const predefinedNext: ActivityTemplate[] = [];
      combinedTemplates.forEach((template: any) => {
        const aiGoals = Array.isArray(template?.ai_goals) ? template.ai_goals : [];
        const isCustom = aiGoals.some((goal: string) => customGoalLowerSet.has(String(goal).toLowerCase()));
        (isCustom ? customFirst : predefinedNext).push(template);
      });
      combinedTemplates = [...customFirst, ...predefinedNext];
    }

    let groupedByGoal: Record<string, ActivityTemplate[]> | undefined;
    if (request.groupByGoals) {
      groupedByGoal = {};
      // Preserve insertion order: custom goals first, then predefined goals.
      // This makes the result predictable for clients that render sections in object-key order.
      for (const { goal } of normalizedGoals.goalEntries) {
        const goalLower = goal.toLowerCase();
        groupedByGoal[goal] = combinedTemplates.filter((template: any) => {
          if (!Array.isArray(template?.ai_goals)) {
            return false;
          }
          return template.ai_goals.some((g: string) => String(g).toLowerCase() === goalLower);
        });
      }
    }

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

  private createEmptyRoutineSuggestionsTelemetry(): RoutineSuggestionsPipelineTelemetry {
    return {
      stageDurations: {
        validateUserMs: 0,
        directMatchQueryMs: 0,
        ragRetrieveMs: 0,
        ragRerankMs: 0,
        ragGenerateMs: 0,
        durationFilterMs: 0,
        persistGeneratedMs: 0,
        totalMs: 0,
      },
      counters: {
        directMatchCount: 0,
        ragGoalCount: 0,
        ragTemplateCandidates: 0,
        rerankLlmCalls: 0,
        rerankShortcutAccepts: 0,
        rerankShortcutRejects: 0,
        acceptedTemplateCount: 0,
        generatedHabitCount: 0,
      },
    };
  }

  private recordRerankCounters(
    suggestionResult: GenerateSuggestionsResponse,
    telemetry: RoutineSuggestionsPipelineTelemetry,
  ): void {
    if (!suggestionResult.telemetry) {
      return;
    }
    const { counters } = telemetry;

    if (suggestionResult.telemetry.llmInvoked) {
      counters.rerankLlmCalls += 1;
    }
    if (suggestionResult.telemetry.shortcutAccepted) {
      counters.rerankShortcutAccepts += 1;
    }
    if (suggestionResult.telemetry.shortcutRejected) {
      counters.rerankShortcutRejects += 1;
    }
  }

  private async generateHabitsWithTiming(
    goal: string,
    options: { limit?: number; routineType?: ActivityType | string; routineDurationSeconds?: number },
    telemetry: RoutineSuggestionsPipelineTelemetry,
  ): Promise<GeneratedHabitSuggestion[]> {
    const generationStartedAt = Date.now();
    const generated = await this.routineSuggestionGeneratorService.generateNewHabits(goal, options);
    const { stageDurations } = telemetry;
    stageDurations.ragGenerateMs += Date.now() - generationStartedAt;
    return generated;
  }

  private async emitRoutineSuggestionsTelemetry({
    success,
    stageDurations,
    counters,
    context,
    error,
  }: {
    success: boolean;
    stageDurations: RoutineSuggestionsStageDurations;
    counters: RoutineSuggestionsCounters;
    context: RoutineSuggestionsMetricsContext;
    error?: Error;
  }): Promise<void> {
    const payload = {
      event: 'AiPipelineTimingV1',
      pipeline: ROUTINE_SUGGESTIONS_PIPELINE,
      operation: ROUTINE_SUGGESTIONS_OPERATION,
      success,
      durationMs: stageDurations.totalMs,
      stageDurationsMs: stageDurations,
      counters,
      asyncTaskId: context.asyncTaskId ?? null,
      jobId: null,
      requestHash: context.requestHash ?? null,
      attempt: null,
      userId: context.userId,
      errorName: error?.name,
      errorMessage: error?.message,
    };

    if (success) {
      this.logger.log(JSON.stringify(payload));
    } else {
      this.logger.error(JSON.stringify(payload), error?.stack);
    }

    const metrics = this.getMetricsConfig();
    const shouldEmitMetrics = Boolean(metrics.emitUserActivityMetrics || metrics.emitQueueMetrics);
    if (!shouldEmitMetrics) {
      return;
    }

    try {
      await emitAiPipelineMetrics({
        namespace: metrics.namespace,
        environment: metrics.environment,
        service: metrics.service,
        pipeline: ROUTINE_SUGGESTIONS_PIPELINE,
        operation: ROUTINE_SUGGESTIONS_OPERATION,
        success,
        durationMs: stageDurations.totalMs,
        stageDurationsMs: stageDurations,
        counters,
      });
    } catch {
      // Best-effort: metrics must not impact request execution.
    }
  }

  private getMetricsConfig(): MetricsConfig {
    return (
      this.configService?.get<MetricsConfig>('metrics') || {
        emitQueueMetrics: true,
        emitUserActivityMetrics: true,
        pollIntervalMs: 60_000,
        namespace: 'FocusBear/Queues',
        service: 'api',
        environment: 'prod',
        logQueueFailures: true,
      }
    );
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
    const maxDurationMinutes = routineDurationSeconds
      ? Math.max(1, Math.floor(routineDurationSeconds / ONE_MINUTE_SECONDS))
      : undefined;

    Object.entries(generatedByGoal).forEach(([goal, habits]) => {
      byGoal[goal] = [];
      habits.forEach((habit) => {
        const rawDurationMinutes = habit.durationMinutes ?? fallbackDurationMinutes;
        const durationMinutes =
          typeof maxDurationMinutes === 'number'
            ? Math.min(rawDurationMinutes, maxDurationMinutes)
            : rawDurationMinutes;
        const sanitizedName = this.sanitizeDurationPhrases(habit.name ?? '');
        const activityType =
          typeof habit.routineType === 'string'
            ? (habit.routineType.toLowerCase() as ActivityType)
            : (fallbackRoutineType as ActivityType | undefined) ?? ActivityType.morning;
        const durationSeconds = Math.max(ONE_MINUTE_SECONDS, Math.round(durationMinutes) * ONE_MINUTE_SECONDS);
        const rawDescription = habit.description ?? '';
        const description = this.sanitizeDurationPhrases(rawDescription);

        const generatedActivity: any = {
          id: randomUUID(),
          name: sanitizedName || habit.name,
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

  /**
   * Removes explicit duration phrasing from generated descriptions so the UI doesn't double-announce time.
   */
  private sanitizeDurationPhrases(text: string): string {
    if (!text) return '';
    const durationPattern =
      /\b\d+(?:\s*[–—-]\s*\d+)?\s*[–—-]?\s*(?:hours?|hrs?|hr|minutes?|minute|mins?|min|seconds?|second|secs?|sec|s)\b[:.,-]?\s*/gi;
    const cleaned = text
      .replace(durationPattern, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
    return cleaned;
  }

  private async persistGeneratedHabits(
    userId: string | undefined,
    generatedByGoal: Record<string, GeneratedHabitSuggestion[]>,
    request: GetRoutineSuggestionsDto,
    hasGeneratedHabits: boolean,
    options?: RagRequestOptions,
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
    const hasExplicitGoals = (createHabitWithAiDto.user_goals?.length ?? 0) > 0;
    const rawGoals = hasExplicitGoals ? (createHabitWithAiDto.user_goals as string[]) : [createHabitWithAiDto.prompt];
    const goals = this.normalizeUserGoals(rawGoals.map((goal) => ({ goal, isCustom: !hasExplicitGoals })));
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
        routineType: habit.activity_type ?? (request.groupByGoals ? null : null),
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
