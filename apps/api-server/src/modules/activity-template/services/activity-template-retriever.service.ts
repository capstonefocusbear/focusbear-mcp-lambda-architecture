import { Injectable } from '@nestjs/common';
import { ActivityTemplateGoalEmbeddingService } from './activity-template-goal-embedding.service';
import {
  ActivityTemplateEmbeddingMatch,
  ActivityTemplateEmbeddingRepository,
} from '../repository/activity-template-embedding.repository';

@Injectable()
export class ActivityTemplateRetrieverService {
  constructor(
    private readonly goalEmbeddingService: ActivityTemplateGoalEmbeddingService,
    private readonly embeddingRepository: ActivityTemplateEmbeddingRepository,
  ) {}

  async retrieveByGoal(goal: string, limit = 10): Promise<ActivityTemplateEmbeddingMatch[]> {
    const embedding = await this.goalEmbeddingService.generateEmbedding(goal);
    if (!embedding.length) {
      return [];
    }
    return this.embeddingRepository.findNearestByEmbedding(embedding, limit);
  }
}
