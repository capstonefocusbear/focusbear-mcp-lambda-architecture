import { Injectable, Logger } from '@nestjs/common';
import { OpenAIService } from '@app/openai';

export interface EmbeddingContext {
  description?: string | null;
  tags?: string[];
  routineType?: string | null;
  /**
   * When provided, this raw text will be embedded as-is.
   * Other context fields are ignored.
   */
  rawText?: string | null;
}

@Injectable()
export class ActivityTemplateGoalEmbeddingService {
  private readonly logger = new Logger(ActivityTemplateGoalEmbeddingService.name);

  constructor(private readonly openAIService: OpenAIService) {}

  async generateEmbedding(goal: string, context?: EmbeddingContext): Promise<number[]> {
    const normalizedGoal = goal?.trim();
    const textToEmbed = this.buildEmbeddingText(normalizedGoal, context);

    if (!textToEmbed) {
      return [];
    }

    const startedAt = Date.now();
    const embedding = await this.openAIService.createEmbedding(textToEmbed);
    const elapsedMs = Date.now() - startedAt;

    this.logger.debug(
      `RoutineSuggestions:embedding ${JSON.stringify({
        goal: normalizedGoal ?? '[raw]',
        elapsedMs,
        embeddingLength: embedding.length,
      })}`,
    );

    return embedding;
  }

  private buildEmbeddingText(goal: string | undefined | null, context?: EmbeddingContext): string {
    if (context?.rawText) {
      return context.rawText.trim();
    }

    if (!goal && !context) {
      return '';
    }

    const parts: string[] = [];

    if (goal) {
      parts.push(goal);
    }

    if (context?.description) {
      const trimmedDescription = context.description.trim();
      if (trimmedDescription) {
        parts.push(trimmedDescription);
      }
    }

    if (context?.tags && context.tags.length > 0) {
      parts.push(`Tags: ${context.tags.join(', ')}`);
    }

    if (context?.routineType) {
      parts.push(`Routine: ${context.routineType}`);
    }

    return parts.filter(Boolean).join('\n');
  }
}
