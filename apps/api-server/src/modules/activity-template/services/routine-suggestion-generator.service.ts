import { Injectable } from '@nestjs/common';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { ChatCompletionMessageParam } from 'openai/resources';
import { OpenAIService } from '@app/openai';
import { ActivityTemplate } from '../entity/activity-template.entity';
import { ActivityType } from '../../activity/domain/activity-type.enum';

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

@Injectable()
export class RoutineSuggestionGeneratorService {
  private static readonly MAX_CONTEXT_CANDIDATES = 10;

  private static readonly DEFAULT_GENERATED_LIMIT = 3;

  private static readonly MINUTES_FALLBACK = 10;

  private static readonly MIN_MATCH_SCORE = 0.7;

  constructor(private readonly openAIService: OpenAIService, @InjectSentry() private readonly sentry: SentryService) {}

  async generateSuggestions(
    goal: string,
    candidates: RoutineSuggestionCandidate[],
    { limit = 5 }: { limit?: number } = {},
  ): Promise<RoutineSuggestionResult[]> {
    if (!candidates.length) {
      return [];
    }

    const normalizedLimit = Math.max(1, limit);
    const sortedCandidates = [...candidates].sort((a, b) => b.similarity - a.similarity);
    const promptContext = this.buildContext(
      sortedCandidates.slice(0, RoutineSuggestionGeneratorService.MAX_CONTEXT_CANDIDATES),
    );

    const messages: ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: `You are an assistant that selects habits from a provided list to help a user reach their goal.
Only use the supplied habits. For each selected habit, return an object containing:
- habitId (string from the supplied list)
- name (string, goal-aligned rename of the habit; keep it under 60 characters)
- description (string, <= 120 characters explaining the habit's focus)
- justification (string, <= 120 characters explaining why it helps with the goal)
- matchScore (number between 0 and 1)
If the goal is already well represented by the habits, pick the best matches. If none fit, return an empty array.`,
      },
      {
        role: 'user',
        content: `User goal: ${goal}\n\nHabit options:\n${promptContext}`,
      },
    ];

    try {
      const response = await this.openAIService.createChatCompletion(messages, {
        params: { temperature: 0.2 },
      });
      const content = response.choices?.[0]?.message?.content ?? '[]';
      const { results: parsedResults, parsedCount } = this.parseResponse(
        content,
        sortedCandidates,
        normalizedLimit,
        RoutineSuggestionGeneratorService.MIN_MATCH_SCORE,
      );
      if (parsedResults.length) {
        return parsedResults;
      }
      if (parsedCount > 0) {
        return [];
      }
    } catch (error) {
      this.sentry.instance().captureException(error, {
        level: 'error',
        extra: { goal },
      });
    }

    const fallback = this.buildFallbackSuggestions(
      sortedCandidates,
      goal,
      normalizedLimit,
      RoutineSuggestionGeneratorService.MIN_MATCH_SCORE,
    );
    if (fallback.length) {
      return fallback;
    }
    return [];
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
  ): { results: RoutineSuggestionResult[]; parsedCount: number } {
    try {
      const parsed = JSON.parse(content);
      if (!Array.isArray(parsed)) {
        return { results: [], parsedCount: 0 };
      }

      const candidateMap = new Map(candidates.map((candidate) => [candidate.template.id, candidate]));

      const results: RoutineSuggestionResult[] = [];
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
      return { results: limited, parsedCount: parsed.length };
    } catch (error) {
      this.sentry.instance().captureException(error, {
        level: 'warning',
        extra: { rawContent: content },
      });
      return { results: [], parsedCount: 0 };
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
      limit = RoutineSuggestionGeneratorService.DEFAULT_GENERATED_LIMIT,
      routineType,
      routineDurationSeconds,
    }: { limit?: number; routineType?: ActivityType | string; routineDurationSeconds?: number } = {},
  ): Promise<GeneratedHabitSuggestion[]> {
    const normalizedLimit = Math.max(1, limit);
    const preferredRoutineType = routineType ?? 'any';
    const preferredDurationMinutes = routineDurationSeconds
      ? Math.max(1, Math.round(routineDurationSeconds / 60))
      : RoutineSuggestionGeneratorService.MINUTES_FALLBACK;

    const messages: ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: `You design helpful habits for Focus Bear users. Generate up to ${normalizedLimit} habits that move the user toward their goal.
Return ONLY a JSON array. Each habit must include:
- name (string, concise and goal-aligned)
- description (string, what the user does)
- routineType ("morning" or "evening")
- durationMinutes (integer, >= 1)
- justification (<=120 characters summarising why it helps)`,
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
        params: { temperature: 0.3 },
      });
      const content = response.choices?.[0]?.message?.content ?? '[]';
      return this.parseGeneratedHabits(content, normalizedLimit);
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
