import { Injectable } from '@nestjs/common';
import { OpenAIService } from '@app/openai';

@Injectable()
export class ActivityTemplateGoalEmbeddingService {
  constructor(private readonly openAIService: OpenAIService) {}

  async generateEmbedding(goal: string): Promise<number[]> {
    const normalizedGoal = goal?.trim();
    if (!normalizedGoal) {
      return [];
    }
    return this.openAIService.createEmbedding(normalizedGoal);
  }
}
