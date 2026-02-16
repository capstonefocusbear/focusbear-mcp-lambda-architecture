import { Injectable, Logger } from '@nestjs/common';
import { ActivityTemplateGoalEmbeddingService } from './activity-template-goal-embedding.service';
import {
  ActivityTemplateEmbeddingMatch,
  ActivityTemplateEmbeddingRepository,
} from '../repository/activity-template-embedding.repository';
import { normalizeRoutineTypeToActivityType } from '../../activity/domain/activity-type.enum';

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
    const normalizedActivityType = normalizeRoutineTypeToActivityType(options?.routineType);
    const embedding = await this.goalEmbeddingService.generateEmbedding(
      rawText,
      normalizedActivityType ? { routineType: normalizedActivityType } : { rawText },
    );
    const elapsedMs = Date.now() - startedAt;
    if (process.env.NODE_ENV !== 'production') {
      this.logger.debug(
        `RoutineSuggestions:retrieveByText ${JSON.stringify({
          elapsedMs,
          embeddingPresent: embedding.length > 0,
          limit,
          routineType: normalizedActivityType,
        })}`,
      );
    }
    if (!embedding.length) {
      return [];
    }
    const matches = await this.embeddingRepository.findNearestByEmbedding(embedding, limit, {
      activityType: normalizedActivityType,
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
    const normalizedActivityType = normalizeRoutineTypeToActivityType(options?.routineType);
    const embedding = await this.goalEmbeddingService.generateEmbedding(
      goal,
      normalizedActivityType ? { routineType: normalizedActivityType } : undefined,
    );
    const elapsedMs = Date.now() - startedAt;
    if (process.env.NODE_ENV !== 'production') {
      this.logger.debug(
        `RoutineSuggestions:retrieveByGoal ${JSON.stringify({
          goal,
          elapsedMs,
          embeddingPresent: embedding.length > 0,
          limit,
          routineType: normalizedActivityType,
        })}`,
      );
    }
    if (!embedding.length) {
      return [];
    }
    const matches = await this.embeddingRepository.findNearestByEmbedding(embedding, limit, {
      activityType: normalizedActivityType,
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

  async retrieveByTexts(
    rawTexts: string[],
    limit = 10,
    options?: { routineType?: string },
  ): Promise<ActivityTemplateEmbeddingMatch[][]> {
    if (!rawTexts?.length) {
      return [];
    }

    const startedAt = Date.now();
    const normalizedActivityType = normalizeRoutineTypeToActivityType(options?.routineType);
    const embeddings = await this.goalEmbeddingService.generateEmbeddings(
      rawTexts,
      rawTexts.map((rawText) => (normalizedActivityType ? { routineType: normalizedActivityType } : { rawText })),
    );
    const elapsedMs = Date.now() - startedAt;
    if (process.env.NODE_ENV !== 'production') {
      this.logger.debug(
        `RoutineSuggestions:retrieveByTexts ${JSON.stringify({
          elapsedMs,
          textCount: rawTexts.length,
          embeddedCount: embeddings.filter((embedding) => embedding.length > 0).length,
          limit,
          routineType: normalizedActivityType,
        })}`,
      );
    }

    const results = await Promise.all(
      embeddings.map(async (embedding) => {
        if (!embedding.length) {
          return [];
        }
        return this.embeddingRepository.findNearestByEmbedding(embedding, limit, {
          activityType: normalizedActivityType,
        });
      }),
    );

    if (process.env.NODE_ENV !== 'production') {
      this.logger.debug(
        `RoutineSuggestions:embeddingMatchesBatch ${JSON.stringify({
          textCount: rawTexts.length,
          totalMatchCount: results.reduce((acc, matches) => acc + matches.length, 0),
          matchCounts: results.map((matches) => matches.length),
        })}`,
      );
    }

    return results;
  }
}
