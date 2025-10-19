import { Injectable } from '@nestjs/common';

export interface ActivityTemplateEmbeddingMatch {
  activityTemplateId: string;
  similarity: number;
}

@Injectable()
export class ActivityTemplateEmbeddingRepository {
  /* istanbul ignore next -- Placeholder implementation pending vector store integration */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async findNearestByEmbedding(_embedding: number[], _limit: number): Promise<ActivityTemplateEmbeddingMatch[]> {
    return [];
  }
}
