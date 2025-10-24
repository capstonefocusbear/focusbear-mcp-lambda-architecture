import { Injectable } from '@nestjs/common';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { ChatCompletionMessageParam } from 'openai/resources';
import { OpenAIService } from '@app/openai';
import { ActivityTemplate } from '../entity/activity-template.entity';
import { ActivityType } from '../../activity/domain/activity-type.enum';

const MAX_CONTEXT_CANDIDATES = 10;
const DEFAULT_GENERATED_LIMIT = 3;
const DEFAULT_MINUTES_FALLBACK = 10;
const DEFAULT_MIN_MATCH_SCORE = 0.7;
const DEFAULT_SUGGESTION_LIMIT = 5;
const SELECTION_TEMPERATURE = 0.2;
const GENERATION_TEMPERATURE = 1;

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
}

export interface GenerateSuggestionsResponse {
  accepted: RoutineSuggestionResult[];
  rejectedCount: number;
  parsedCount: number;
  minScoreApplied: number;
}

@Injectable()
export class RoutineSuggestionGeneratorService {
  constructor(private readonly openAIService: OpenAIService, @InjectSentry() private readonly sentry: SentryService) {}

  async generateSuggestions(
    goal: string,
    candidates: RoutineSuggestionCandidate[],
    { limit = DEFAULT_SUGGESTION_LIMIT, minMatchScore }: GenerateSuggestionsOptions = {},
  ): Promise<GenerateSuggestionsResponse> {
    if (!candidates.length) {
      return {
        accepted: [],
        rejectedCount: 0,
        parsedCount: 0,
        minScoreApplied: this.resolveMinMatchScore(minMatchScore),
      };
    }

    const normalizedLimit = Math.max(1, limit);
    const scoreThreshold = this.resolveMinMatchScore(minMatchScore);
    const sortedCandidates = [...candidates].sort((a, b) => b.similarity - a.similarity);
    const promptContext = this.buildContext(sortedCandidates.slice(0, MAX_CONTEXT_CANDIDATES));

    const messages: ChatCompletionMessageParam[] = [
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
- If no habit is strong enough, return an empty array so downstream logic can generate new ones.`,
      },
      {
        role: 'user',
        content: `User goal: ${goal}\n\nHabit options:\n${promptContext}`,
      },
    ];

    try {
      const response = await this.openAIService.createChatCompletion(messages, {
        params: { temperature: SELECTION_TEMPERATURE },
      });
      const content = response.choices?.[0]?.message?.content ?? '[]';
      const { accepted, rejectedCount, parsedCount } = this.parseResponse(
        content,
        sortedCandidates,
        normalizedLimit,
        scoreThreshold,
      );
      if (accepted.length) {
        return { accepted, rejectedCount, parsedCount, minScoreApplied: scoreThreshold };
      }
      if (parsedCount > 0) {
        return { accepted: [], rejectedCount, parsedCount, minScoreApplied: scoreThreshold };
      }
    } catch (error) {
      this.sentry.instance().captureException(error, {
        level: 'error',
        extra: { goal },
      });
    }

    const fallback = this.buildFallbackSuggestions(sortedCandidates, goal, normalizedLimit, scoreThreshold);
    if (fallback.length) {
      return { accepted: fallback, rejectedCount: 0, parsedCount: 0, minScoreApplied: scoreThreshold };
    }
    return { accepted: [], rejectedCount: 0, parsedCount: 0, minScoreApplied: scoreThreshold };
  }

  private resolveMinMatchScore(override?: number): number {
    if (typeof override === 'number' && Number.isFinite(override)) {
      return override;
    }
    return DEFAULT_MIN_MATCH_SCORE;
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

  private parseResponse(
    content: string,
    candidates: RoutineSuggestionCandidate[],
    limit: number,
    minMatchScore: number,
  ): { accepted: RoutineSuggestionResult[]; rejectedCount: number; parsedCount: number } {
    try {
      const parsed = JSON.parse(content);
      if (!Array.isArray(parsed)) {
        return { accepted: [], rejectedCount: 0, parsedCount: 0 };
      }

      const candidateMap = new Map(candidates.map((candidate) => [candidate.template.id, candidate]));

      const results: RoutineSuggestionResult[] = [];
      let rejectedCount = 0;
      parsed.forEach((item) => {
        const habitId = item?.habitId || item?.templateId || item?.id;
        if (!habitId) {
          return;
        }
        const candidate = candidateMap.get(habitId);
        if (!candidate) {
          return;
        }
        const rawScore = typeof item.matchScore === 'number' ? item.matchScore : candidate.similarity;
        const normalizedScore = Number.isFinite(rawScore)
          ? Math.min(1, Math.max(0, Number(rawScore)))
          : candidate.similarity;
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
          matchScore: normalizedScore,
          template: candidate.template,
        });
      });
      const limited = results.slice(0, limit);
      return { accepted: limited, rejectedCount, parsedCount: parsed.length };
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
    const qualified = candidates.filter((candidate) => candidate.similarity >= minMatchScore);
    return qualified.slice(0, limit).map((candidate) => ({
      habitId: candidate.template.id,
      name: candidate.template.activity_data?.name,
      description: candidate.template.activity_data?.text_instructions,
      justification: `High semantic match with goal "${goal}" based on embedding similarity.`,
      matchScore: Number(Math.min(1, Math.max(0, candidate.similarity)).toFixed(2)),
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

    const messages: ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: `You design highly specific, practical habits that move a Focus Bear user toward their stated goal.
Analyse the goal text to understand the desired outcome, key skills, and relevant contexts. Generate up to ${normalizedLimit} habits that directly advance those needs (avoid generic wellness tips unless they are explicitly required by the goal).
Return ONLY a JSON array. Each habit must include:
- name (string, concise and goal-aligned)
- description (string, what the user does)
- routineType ("morning" or "evening")
- durationMinutes (integer, >= 1)
- justification (<=120 characters summarising why it helps)
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

    try {
      const response = await this.openAIService.createChatCompletion(messages, {
        params: { temperature: GENERATION_TEMPERATURE },
      });
      const content = response.choices?.[0]?.message?.content ?? '[]';
      const parsed = this.parseGeneratedHabits(content, normalizedLimit);
      if (!parsed.length) {
        this.sentry.instance().captureMessage('RoutineSuggestion: no habits generated by OpenAI', {
          level: 'warning',
          extra: { goal, limit: normalizedLimit, routineType: preferredRoutineType },
        });
      }
      return parsed;
    } catch (error) {
      this.sentry.instance().captureException(error, {
        level: 'error',
        extra: { goal, preferredRoutineType },
      });
      return [];
    }
  }

  private parseGeneratedHabits(content: string, limit: number): GeneratedHabitSuggestion[] {
    try {
      const parsed = JSON.parse(content);
      if (!Array.isArray(parsed)) {
        return [];
      }

      const results: GeneratedHabitSuggestion[] = [];
      parsed.forEach((item) => {
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
}
