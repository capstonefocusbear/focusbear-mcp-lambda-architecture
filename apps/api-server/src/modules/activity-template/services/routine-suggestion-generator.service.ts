import { Injectable, Logger } from '@nestjs/common';
import { InjectSentry, SentryService } from '@app/observability';
import { ChatCompletionMessageParam } from 'openai/resources';
import { OpenAIService, PromptCacheService } from '@app/openai';
import { createHash } from 'crypto';
import { ActivityTemplate } from '../entity/activity-template.entity';
import { ActivityType } from '../../activity/domain/activity-type.enum';

const MAX_CONTEXT_CANDIDATES = 5;
const DEFAULT_GENERATED_LIMIT = 3;
const DEFAULT_MINUTES_FALLBACK = 10;
const DEFAULT_MIN_MATCH_SCORE = 0.5;
const DEFAULT_SUGGESTION_LIMIT = 5;
const SHORTCUT_ACCEPT_SIMILARITY_THRESHOLD = 0.7;
const SHORTCUT_ACCEPT_TOP_FLOOR = 0.6;
const SHORTCUT_ACCEPT_GAP_THRESHOLD = 0.15;
const SHORTCUT_REJECT_SIMILARITY_THRESHOLD = 0.25;
const LLM_SCORE_WEIGHT = 0.65;
const MAX_LLM_UPLIFT_OVER_SIMILARITY = 0.25;

const ROUTINE_SUGGESTIONS_RERANK_RESPONSE_FORMAT = {
  type: 'json_schema',
  json_schema: {
    name: 'routine_suggestions_rerank',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        suggestions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              habitId: { type: 'string', minLength: 1 },
              name: { type: 'string', minLength: 1 },
              description: { type: 'string' },
              justification: { type: 'string' },
              matchScore: { type: 'number', minimum: 0, maximum: 1 },
            },
            required: ['habitId', 'name', 'description', 'justification', 'matchScore'],
            additionalProperties: false,
          },
        },
      },
      required: ['suggestions'],
      additionalProperties: false,
    },
  },
} as const;

const ROUTINE_SUGGESTIONS_GENERATION_RESPONSE_FORMAT = {
  type: 'json_schema',
  json_schema: {
    name: 'routine_suggestions_generate',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        habits: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', minLength: 1 },
              description: { type: 'string' },
              routineType: { type: 'string', enum: ['morning', 'evening', 'break'] },
              durationMinutes: { type: 'integer', minimum: 1, maximum: 120 },
              justification: { type: 'string' },
            },
            required: ['name', 'description', 'routineType', 'durationMinutes', 'justification'],
            additionalProperties: false,
          },
        },
      },
      required: ['habits'],
      additionalProperties: false,
    },
  },
} as const;

export interface RoutineSuggestionCandidate {
  template: ActivityTemplate;
  similarity: number;
}

export interface RoutineSuggestionResult {
  habitId: string;
  name?: string;
  description?: string;
  justification: string;
  matchScore: number;
  template: ActivityTemplate;
}

export interface GeneratedHabitSuggestion {
  name: string;
  description?: string;
  routineType?: ActivityType | string;
  durationMinutes?: number;
  justification?: string;
}

export interface GenerateSuggestionsOptions {
  limit?: number;
  minMatchScore?: number;
  includeTelemetry?: boolean;
}

export type SuggestionEvaluationPath = 'empty' | 'shortcut_accept' | 'shortcut_reject' | 'llm' | 'fallback';

export interface GenerateSuggestionsTelemetry {
  evaluationPath: SuggestionEvaluationPath;
  llmInvoked: boolean;
  shortcutAccepted: boolean;
  shortcutRejected: boolean;
  shortcutReason?: string;
  topSimilarity?: number;
  secondSimilarity?: number;
  similarityGap?: number;
}

export interface GenerateSuggestionsResponse {
  accepted: RoutineSuggestionResult[];
  rejectedCount: number;
  parsedCount: number;
  minScoreApplied: number;
  telemetry?: GenerateSuggestionsTelemetry;
}

@Injectable()
export class RoutineSuggestionGeneratorService {
  private readonly logger = new Logger(RoutineSuggestionGeneratorService.name);

  constructor(
    private readonly openAIService: OpenAIService,
    @InjectSentry() private readonly sentry: SentryService,
    private readonly promptCacheService: PromptCacheService,
  ) {}

  async generateSuggestions(
    goal: string,
    candidates: RoutineSuggestionCandidate[],
    { limit = DEFAULT_SUGGESTION_LIMIT, minMatchScore, includeTelemetry = false }: GenerateSuggestionsOptions = {},
  ): Promise<GenerateSuggestionsResponse> {
    if (!candidates.length) {
      return this.withTelemetry(
        {
          accepted: [],
          rejectedCount: 0,
          parsedCount: 0,
          minScoreApplied: this.resolveMinMatchScore(minMatchScore),
        },
        {
          evaluationPath: 'empty',
          llmInvoked: false,
          shortcutAccepted: false,
          shortcutRejected: false,
        },
        includeTelemetry,
      );
    }

    const normalizedLimit = Math.max(1, limit);
    const sortedCandidates = [...candidates].sort((a, b) => b.similarity - a.similarity);
    const scoreThreshold = this.resolveMinMatchScore(minMatchScore);

    const shortcutDecision = this.evaluateShortcut(sortedCandidates);
    if (shortcutDecision.decision === 'accept') {
      const accepted = this.buildFallbackSuggestions(sortedCandidates, goal, normalizedLimit, scoreThreshold);
      return this.withTelemetry(
        {
          accepted,
          rejectedCount: 0,
          parsedCount: 0,
          minScoreApplied: scoreThreshold,
        },
        {
          evaluationPath: 'shortcut_accept',
          llmInvoked: false,
          shortcutAccepted: true,
          shortcutRejected: false,
          shortcutReason: shortcutDecision.reason,
          topSimilarity: shortcutDecision.topSimilarity,
          secondSimilarity: shortcutDecision.secondSimilarity,
          similarityGap: shortcutDecision.similarityGap,
        },
        includeTelemetry,
      );
    }

    if (shortcutDecision.decision === 'reject') {
      return this.withTelemetry(
        {
          accepted: [],
          rejectedCount: sortedCandidates.length,
          parsedCount: 0,
          minScoreApplied: scoreThreshold,
        },
        {
          evaluationPath: 'shortcut_reject',
          llmInvoked: false,
          shortcutAccepted: false,
          shortcutRejected: true,
          shortcutReason: shortcutDecision.reason,
          topSimilarity: shortcutDecision.topSimilarity,
          secondSimilarity: shortcutDecision.secondSimilarity,
          similarityGap: shortcutDecision.similarityGap,
        },
        includeTelemetry,
      );
    }

    const promptContext = this.buildContext(sortedCandidates.slice(0, MAX_CONTEXT_CANDIDATES));

    this.logger.debug(
      `RoutineSuggestions:candidates ${JSON.stringify({
        goal,
        minMatchScore: scoreThreshold,
        candidateCount: sortedCandidates.length,
        topCandidates: sortedCandidates.slice(0, 5).map((candidate) => ({
          templateId: candidate.template.id,
          similarity: Number(candidate.similarity.toFixed(4)),
          activityType: candidate.template.activity_type,
          name: candidate.template.activity_data?.name,
        })),
      })}`,
    );

    this.sentry.instance().addBreadcrumb({
      category: 'RoutineSuggestion',
      level: 'info',
      message: 'Evaluating RAG candidates',
      data: {
        minMatchScore: scoreThreshold,
        candidateCount: sortedCandidates.length,
        topCandidates: sortedCandidates.slice(0, 5).map((candidate) => ({
          templateId: candidate.template.id,
          similarity: Number(candidate.similarity.toFixed(4)),
          activityType: candidate.template.activity_type,
        })),
      },
    });

    const messages = this.buildMessages(goal, promptContext, scoreThreshold);

    try {
      const response = await this.openAIService.createChatCompletion(messages, {
        params: {
          response_format: ROUTINE_SUGGESTIONS_RERANK_RESPONSE_FORMAT,
        } as any,
      });
      const content = response.choices?.[0]?.message?.content ?? '[]';
      this.logger.debug(
        `RoutineSuggestions:llmResponse ${JSON.stringify({
          goal,
          responseLength: content.length,
          preview: content.substring(0, 200),
        })}`,
      );
      const { accepted, rejectedCount, parsedCount } = this.parseResponse(
        content,
        sortedCandidates,
        normalizedLimit,
        scoreThreshold,
      );

      this.logger.debug(
        `RoutineSuggestions:parseResult ${JSON.stringify({
          goal,
          parsedCount,
          rejectedCount,
          acceptedCount: accepted.length,
          limit: normalizedLimit,
          minMatchScore: scoreThreshold,
          acceptedHabits: accepted.map((a) => ({
            habitId: a.habitId,
            matchScore: a.matchScore,
            name: a.name,
          })),
        })}`,
      );

      if (accepted.length) {
        return this.withTelemetry(
          { accepted, rejectedCount, parsedCount, minScoreApplied: scoreThreshold },
          {
            evaluationPath: 'llm',
            llmInvoked: true,
            shortcutAccepted: false,
            shortcutRejected: false,
          },
          includeTelemetry,
        );
      }
      if (parsedCount > 0) {
        return this.withTelemetry(
          { accepted: [], rejectedCount, parsedCount, minScoreApplied: scoreThreshold },
          {
            evaluationPath: 'llm',
            llmInvoked: true,
            shortcutAccepted: false,
            shortcutRejected: false,
          },
          includeTelemetry,
        );
      }
    } catch (error) {
      const goalHash = this.hashGoal(goal);
      this.logger.error(
        `RoutineSuggestions:generateSuggestions failed${goalHash ? ` [goalHash=${goalHash}]` : ''}: ${error.message}`,
        error.stack,
      );
      this.sentry.instance().captureException(error, {
        level: 'error',
        extra: {
          operation: 'generateSuggestions',
          candidateCount: candidates.length,
          errorType: error.constructor?.name,
          goalHash,
        },
      });
    }

    const fallback = this.buildFallbackSuggestions(sortedCandidates, goal, normalizedLimit, scoreThreshold);
    if (fallback.length) {
      return this.withTelemetry(
        { accepted: fallback, rejectedCount: 0, parsedCount: 0, minScoreApplied: scoreThreshold },
        {
          evaluationPath: 'fallback',
          llmInvoked: true,
          shortcutAccepted: false,
          shortcutRejected: false,
        },
        includeTelemetry,
      );
    }
    return this.withTelemetry(
      { accepted: [], rejectedCount: 0, parsedCount: 0, minScoreApplied: scoreThreshold },
      {
        evaluationPath: 'fallback',
        llmInvoked: true,
        shortcutAccepted: false,
        shortcutRejected: false,
      },
      includeTelemetry,
    );
  }

  private resolveMinMatchScore(override: number | undefined): number {
    if (typeof override === 'number' && Number.isFinite(override)) {
      return this.normalizeScore(override);
    }

    // Use the default threshold (0.5) – if nothing meets this, we generate instead
    return DEFAULT_MIN_MATCH_SCORE;
  }

  private withTelemetry(
    response: Omit<GenerateSuggestionsResponse, 'telemetry'>,
    telemetry: GenerateSuggestionsTelemetry,
    includeTelemetry: boolean,
  ): GenerateSuggestionsResponse {
    if (!includeTelemetry) {
      return response;
    }
    return {
      ...response,
      telemetry,
    };
  }

  private evaluateShortcut(candidates: RoutineSuggestionCandidate[]): {
    decision: 'accept' | 'reject' | 'none';
    reason?: string;
    topSimilarity?: number;
    secondSimilarity?: number;
    similarityGap?: number;
  } {
    if (!candidates.length) {
      return { decision: 'none' };
    }

    const topSimilarity = this.normalizeScore(candidates[0]?.similarity ?? 0);
    const secondSimilarity = this.normalizeScore(candidates[1]?.similarity ?? 0);
    const similarityGap = Number((topSimilarity - secondSimilarity).toFixed(4));

    if (topSimilarity < SHORTCUT_REJECT_SIMILARITY_THRESHOLD) {
      return {
        decision: 'reject',
        reason: 'low_top_similarity',
        topSimilarity,
        secondSimilarity,
        similarityGap,
      };
    }

    if (topSimilarity >= SHORTCUT_ACCEPT_SIMILARITY_THRESHOLD) {
      return {
        decision: 'accept',
        reason: 'high_top_similarity',
        topSimilarity,
        secondSimilarity,
        similarityGap,
      };
    }

    if (
      candidates.length > 1 &&
      topSimilarity >= SHORTCUT_ACCEPT_TOP_FLOOR &&
      similarityGap >= SHORTCUT_ACCEPT_GAP_THRESHOLD
    ) {
      return {
        decision: 'accept',
        reason: 'strong_similarity_gap',
        topSimilarity,
        secondSimilarity,
        similarityGap,
      };
    }

    return {
      decision: 'none',
      topSimilarity,
      secondSimilarity,
      similarityGap,
    };
  }

  private buildContext(candidates: RoutineSuggestionCandidate[]): string {
    return candidates
      .map(({ template, similarity }, index) => {
        const tagList = (template.tags ?? []).flatMap((tag) => tag.tags ?? []).join(', ');
        const name = template.activity_data?.name ?? 'Unknown habit';
        const description = template.activity_data?.text_instructions ?? 'No description provided.';
        return `Habit ${index + 1}:\n- habitId: ${
          template.id
        }\n- name: ${name}\n- description: ${description}\n- routineType: ${template.activity_type}\n- tags: ${
          tagList || 'none'
        }\n- similarity: ${similarity.toFixed(2)}`;
      })
      .join('\n\n');
  }

  private buildMessages(goal: string, promptContext: string, minMatchScore: number): ChatCompletionMessageParam[] {
    const template = this.promptCacheService.getPrompt('routine-suggestions');
    if (template && template.trim()) {
      const content = this.interpolateTemplate(template, goal, promptContext, minMatchScore);
      return [
        {
          role: 'system',
          content,
        },
      ];
    }

    return [
      {
        role: 'system',
        content: `You are an assistant that analyses a user's stated goal, identifies the core skills, behaviours, or routines required, and then selects the MOST relevant habits from the provided list.
Only use the supplied habits. Evaluate each habit for direct alignment with the goal (not just generic wellness benefits). Skip habits that do not clearly advance the goal.
For every habit you decide to include, return an object containing:
- habitId (string from the supplied list)
- name (string, goal-aligned rename of the habit; keep it under 60 characters)
- description (string, <= 120 characters explaining the habit's focus)
- justification (string, <= 120 characters explaining why it helps with the goal)
- matchScore (number between 0 and 1)
Guidance:
- Prioritise specificity. If the goal mentions a sport, hobby, profession, or skill, favour habits that explicitly train that area.
- Penalise generic movement/meditation/breathing exercises unless the goal text clearly frames them as necessary.
- For matchScore: evaluate semantic relevance between the goal and habit (0-1 scale). The provided similarity is just a starting point - you should adjust based on your understanding of how well the habit supports the goal.
- Reject and omit any habit with matchScore below ${minMatchScore.toFixed(
          2,
        )}. If none qualify, return an empty array so downstream logic can act.`,
      },
      {
        role: 'user',
        content: `User goal: ${goal}\n\nHabit options:\n${promptContext}`,
      },
    ];
  }

  private interpolateTemplate(template: string, goal: string, promptContext: string, minMatchScore: number): string {
    return template
      .replace(/{{\s*goal\s*}}/gi, goal)
      .replace(/{{\s*habits\s*}}/gi, promptContext)
      .replace(/{{\s*minimumMatchScore\s*}}/gi, minMatchScore.toFixed(2));
  }

  private normalizeScore(value: number): number {
    if (!Number.isFinite(value)) {
      return 0;
    }
    return Math.min(1, Math.max(0, Number(value)));
  }

  private combineCandidateAndLlmScore(candidateSimilarity: number, llmScoreNormalized?: number): number {
    if (typeof llmScoreNormalized !== 'number') {
      return candidateSimilarity;
    }

    const blendedScore =
      candidateSimilarity * (1 - LLM_SCORE_WEIGHT) + this.normalizeScore(llmScoreNormalized) * LLM_SCORE_WEIGHT;
    const upliftCappedScore = Math.min(blendedScore, candidateSimilarity + MAX_LLM_UPLIFT_OVER_SIMILARITY);
    return this.normalizeScore(upliftCappedScore);
  }

  private parseResponse(
    content: string,
    candidates: RoutineSuggestionCandidate[],
    limit: number,
    minMatchScore: number,
  ): { accepted: RoutineSuggestionResult[]; rejectedCount: number; parsedCount: number } {
    try {
      const parsed = JSON.parse(content);

      // Handle both new object format and legacy array format for backward compatibility
      let items: unknown[];
      if (Array.isArray(parsed)) {
        items = parsed;
      } else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.suggestions)) {
        items = parsed.suggestions;
      } else {
        return { accepted: [], rejectedCount: 0, parsedCount: 0 };
      }

      const candidateMap = new Map(candidates.map((candidate) => [candidate.template.id, candidate]));

      const results: RoutineSuggestionResult[] = [];
      let rejectedCount = 0;
      items.forEach((item: any) => {
        const habitId = item?.habitId || item?.templateId || item?.id;
        if (!habitId) {
          return;
        }
        const candidate = candidateMap.get(habitId);
        if (!candidate) {
          return;
        }

        const llmScore = Number.isFinite(item?.matchScore) ? Number(item.matchScore) : undefined;
        const candidateSimilarity = this.normalizeScore(candidate.similarity);
        const llmScoreNormalized = typeof llmScore === 'number' ? this.normalizeScore(llmScore) : undefined;
        // Blend retrieval + LLM judgment while capping uplift to keep matches grounded in retriever quality.
        const normalizedScore = this.combineCandidateAndLlmScore(candidateSimilarity, llmScoreNormalized);

        if (normalizedScore < minMatchScore) {
          rejectedCount += 1;
          return;
        }
        const justification = typeof item.justification === 'string' ? item.justification : '';
        const name = typeof item.name === 'string' ? item.name : candidate.template.activity_data?.name;
        const description =
          typeof item.description === 'string' ? item.description : candidate.template.activity_data?.text_instructions;

        results.push({
          habitId,
          name,
          description,
          justification,
          matchScore: Number(normalizedScore.toFixed(2)),
          template: candidate.template,
        });
      });
      const limited = results.slice(0, limit);
      return { accepted: limited, rejectedCount, parsedCount: items.length };
    } catch (error) {
      this.sentry.instance().captureException(error, {
        level: 'warning',
        extra: { rawContent: content },
      });
      return { accepted: [], rejectedCount: 0, parsedCount: 0 };
    }
  }

  private buildFallbackSuggestions(
    candidates: RoutineSuggestionCandidate[],
    goal: string,
    limit: number,
    minMatchScore: number,
  ): RoutineSuggestionResult[] {
    const qualified = candidates.filter((candidate) => this.normalizeScore(candidate.similarity) >= minMatchScore);
    return qualified.slice(0, limit).map((candidate) => ({
      habitId: candidate.template.id,
      name: candidate.template.activity_data?.name,
      description: candidate.template.activity_data?.text_instructions,
      justification: `High semantic match with goal "${goal}" based on embedding similarity.`,
      matchScore: Number(this.normalizeScore(candidate.similarity).toFixed(2)),
      template: candidate.template,
    }));
  }

  async generateNewHabits(
    goal: string,
    {
      limit = DEFAULT_GENERATED_LIMIT,
      routineType,
      routineDurationSeconds,
    }: { limit?: number; routineType?: ActivityType | string; routineDurationSeconds?: number } = {},
  ): Promise<GeneratedHabitSuggestion[]> {
    const normalizedLimit = Math.max(1, limit);
    const preferredRoutineType = routineType ?? 'any';
    const preferredDurationMinutes = routineDurationSeconds
      ? Math.max(1, Math.round(routineDurationSeconds / 60))
      : DEFAULT_MINUTES_FALLBACK;

    const messages = this.buildGenerationMessages(
      goal,
      normalizedLimit,
      preferredRoutineType,
      preferredDurationMinutes,
    );

    try {
      const response = await this.openAIService.createChatCompletion(messages, {
        params: {
          response_format: ROUTINE_SUGGESTIONS_GENERATION_RESPONSE_FORMAT,
        } as any,
      });
      const content = response.choices?.[0]?.message?.content ?? '[]';
      const parsed = this.parseGeneratedHabits(content, normalizedLimit);
      if (!parsed.length) {
        this.sentry.instance().captureMessage('RoutineSuggestion: no habits generated by OpenAI', {
          level: 'warning',
          extra: { limit: normalizedLimit, routineType: preferredRoutineType },
        });
      }
      return parsed;
    } catch (error) {
      const goalHash = this.hashGoal(goal);
      this.logger.error(
        `RoutineSuggestions:generateNewHabits failed${goalHash ? ` [goalHash=${goalHash}]` : ''}: ${error.message}`,
        error.stack,
      );
      this.sentry.instance().captureException(error, {
        level: 'error',
        extra: {
          operation: 'generateNewHabits',
          preferredRoutineType,
          limit: normalizedLimit,
          errorType: error.constructor?.name,
          goalHash,
        },
      });
      return [];
    }
  }

  private buildGenerationMessages(
    goal: string,
    limit: number,
    preferredRoutineType: string,
    preferredDurationMinutes: number,
  ): ChatCompletionMessageParam[] {
    const template = this.promptCacheService.getPrompt('routine-suggestions-generate');
    if (template?.trim()) {
      const content = template
        .replace(/{{\s*goal\s*}}/gi, goal)
        .replace(/{{\s*limit\s*}}/gi, String(limit))
        .replace(/{{\s*routineType\s*}}/gi, preferredRoutineType)
        .replace(/{{\s*durationMinutes\s*}}/gi, String(preferredDurationMinutes));
      return [{ role: 'system', content }];
    }

    return [
      {
        role: 'system',
        content: `You design highly specific, practical habits that move a Focus Bear user toward their stated goal.
Analyse the goal text to understand the desired outcome, key skills, and relevant contexts. Generate up to ${limit} habits that directly advance those needs (avoid generic wellness tips unless they are explicitly required by the goal).
Return ONLY a JSON object with a "habits" array. Each habit must include:
- name (string, concise and goal-aligned)
- description (string, what the user does)
- routineType ("morning", "evening", or "break")
- durationMinutes (integer, >= 1)
- justification (<=120 characters summarising why it helps)
Example: { "habits": [{ "name": "...", "description": "...", "routineType": "morning", "durationMinutes": 10, "justification": "..." }] }
Guidance:
- Tailor the habit to the goal: reference domain language, necessary drills, study plans, or lifestyle adjustments that fit the goal.
- Include a mix of training, learning, strategy, or recovery actions as appropriate for the outcome.
- Prefer measurable, repeatable actions over vague advice.`,
      },
      {
        role: 'user',
        content: `User goal: ${goal}
Preferred routine type: ${preferredRoutineType}
Target routine duration (minutes): ${preferredDurationMinutes}`,
      },
    ];
  }

  private parseGeneratedHabits(content: string, limit: number): GeneratedHabitSuggestion[] {
    try {
      const parsed = JSON.parse(content);

      // Handle both new object format and legacy array format for backward compatibility
      let items: unknown[];
      if (Array.isArray(parsed)) {
        items = parsed;
      } else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.habits)) {
        items = parsed.habits;
      } else {
        return [];
      }

      const results: GeneratedHabitSuggestion[] = [];
      items.forEach((item: any) => {
        if (!item || typeof item !== 'object') {
          return;
        }
        if (typeof item.name !== 'string' || !item.name.trim()) {
          return;
        }
        results.push({
          name: item.name,
          description: typeof item.description === 'string' ? item.description : undefined,
          routineType: typeof item.routineType === 'string' ? item.routineType : undefined,
          durationMinutes:
            typeof item.durationMinutes === 'number' && Number.isFinite(item.durationMinutes)
              ? Math.max(1, Math.round(item.durationMinutes))
              : undefined,
          justification: typeof item.justification === 'string' ? item.justification : undefined,
        });
      });
      return results.slice(0, limit);
    } catch (error) {
      this.sentry.instance().captureException(error, {
        level: 'warning',
        extra: { rawContent: content },
      });
      return [];
    }
  }

  private hashGoal(goal?: string): string | undefined {
    const trimmed = goal?.trim();
    if (!trimmed) {
      return undefined;
    }
    return createHash('sha256').update(trimmed).digest('hex').slice(0, 16);
  }
}
