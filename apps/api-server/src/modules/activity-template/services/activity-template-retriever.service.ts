import { Injectable, Logger } from '@nestjs/common';
import { ActivityTemplateGoalEmbeddingService } from './activity-template-goal-embedding.service';
import {
  ActivityTemplateEmbeddingMatch,
  ActivityTemplateEmbeddingRepository,
} from '../repository/activity-template-embedding.repository';

@Injectable()
export class ActivityTemplateRetrieverService {
  private readonly logger = new Logger(ActivityTemplateRetrieverService.name);

  constructor(
    private readonly goalEmbeddingService: ActivityTemplateGoalEmbeddingService,
    private readonly embeddingRepository: ActivityTemplateEmbeddingRepository,
  ) {}

  async retrieveByText(
    rawText: string,
    limit = 10,
    options?: { routineType?: string },
  ): Promise<ActivityTemplateEmbeddingMatch[]> {
    const startedAt = Date.now();
    const embedding = await this.goalEmbeddingService.generateEmbedding(
      rawText,
      options?.routineType ? { routineType: options.routineType } : { rawText },
    );
    const elapsedMs = Date.now() - startedAt;
    if (process.env.NODE_ENV !== 'production') {
      this.logger.debug(
        `RoutineSuggestions:retrieveByText ${JSON.stringify({
          elapsedMs,
          embeddingPresent: embedding.length > 0,
          limit,
          routineType: options?.routineType,
        })}`,
      );
    }
    if (!embedding.length) {
      return [];
    }
    const matches = await this.embeddingRepository.findNearestByEmbedding(embedding, limit, {
      activityType: options?.routineType,
    });
    if (process.env.NODE_ENV !== 'production') {
      this.logger.debug(
        `RoutineSuggestions:embeddingMatchesText ${JSON.stringify({
          matchCount: matches.length,
          topSimilarities: matches.slice(0, 5).map((match) => Number(match.similarity.toFixed(4))),
        })}`,
      );
    }
    return matches;
  }

  async retrieveByGoal(
    goal: string,
    limit = 10,
    options?: { routineType?: string },
  ): Promise<ActivityTemplateEmbeddingMatch[]> {
    const startedAt = Date.now();
    const embedding = await this.goalEmbeddingService.generateEmbedding(
      goal,
      options?.routineType ? { routineType: options.routineType } : undefined,
    );
    const elapsedMs = Date.now() - startedAt;
    if (process.env.NODE_ENV !== 'production') {
      this.logger.debug(
        `RoutineSuggestions:retrieveByGoal ${JSON.stringify({
          goal,
          elapsedMs,
          embeddingPresent: embedding.length > 0,
          limit,
          routineType: options?.routineType,
        })}`,
      );
    }
    if (!embedding.length) {
      return [];
    }
    const matches = await this.embeddingRepository.findNearestByEmbedding(embedding, limit, {
      activityType: options?.routineType,
    });
    if (process.env.NODE_ENV !== 'production') {
      this.logger.debug(
        `RoutineSuggestions:embeddingMatches ${JSON.stringify({
          goal,
          matchCount: matches.length,
          topSimilarities: matches.slice(0, 5).map((match) => Number(match.similarity.toFixed(4))),
        })}`,
      );
    }
    return matches;
  }
}
