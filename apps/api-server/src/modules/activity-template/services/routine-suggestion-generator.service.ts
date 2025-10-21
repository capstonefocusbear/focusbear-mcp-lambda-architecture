import { Injectable } from '@nestjs/common';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { ChatCompletionMessageParam } from 'openai/resources';
import { OpenAIService } from '@app/openai';
import { ActivityTemplate } from '../entity/activity-template.entity';

export interface RoutineSuggestionCandidate {
  template: ActivityTemplate;
  similarity: number;
}

export interface RoutineSuggestionResult {
  habitId: string;
  justification: string;
  matchScore: number;
  template: ActivityTemplate;
}

@Injectable()
export class RoutineSuggestionGeneratorService {
  private static readonly MAX_CONTEXT_CANDIDATES = 10;

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
        content: `You are an assistant that selects habits from a provided list to help a user reach their goal. Only use the supplied habits. Return a JSON array with fields habitId (string), justification (string <= 120 chars), and matchScore (0-1).
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
      const parsed = this.parseResponse(content, sortedCandidates, normalizedLimit);
      if (parsed.length) {
        return parsed;
      }
    } catch (error) {
      this.sentry.instance().captureException(error, {
        level: 'error',
        extra: { goal },
      });
    }

    return this.buildFallbackSuggestions(sortedCandidates, goal, normalizedLimit);
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
  ): RoutineSuggestionResult[] {
    try {
      const parsed = JSON.parse(content);
      if (!Array.isArray(parsed)) {
        return [];
      }

      const candidateMap = new Map(candidates.map((candidate) => [candidate.template.id, candidate]));

      return parsed
        .map((item) => {
          const habitId = item.habitId || item.templateId || item.id;
          if (!habitId) {
            return null;
          }
          const candidate = candidateMap.get(habitId);
          if (!candidate) {
            return null;
          }
          const matchScore = typeof item.matchScore === 'number' ? item.matchScore : candidate.similarity;
          const justification = typeof item.justification === 'string' ? item.justification : '';
          return {
            habitId,
            justification,
            matchScore,
            template: candidate.template,
          };
        })
        .filter((item): item is RoutineSuggestionResult => !!item)
        .slice(0, limit);
    } catch (error) {
      this.sentry.instance().captureException(error, {
        level: 'warning',
        extra: { rawContent: content },
      });
      return [];
    }
  }

  private buildFallbackSuggestions(
    candidates: RoutineSuggestionCandidate[],
    goal: string,
    limit: number,
  ): RoutineSuggestionResult[] {
    return candidates.slice(0, limit).map((candidate) => ({
      habitId: candidate.template.id,
      justification: `High semantic match with goal "${goal}" based on embedding similarity.`,
      matchScore: Number(candidate.similarity.toFixed(2)),
      template: candidate.template,
    }));
  }
}
