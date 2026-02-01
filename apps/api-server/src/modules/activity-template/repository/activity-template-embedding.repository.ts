import { Injectable } from '@nestjs/common';
import { Connection } from 'typeorm';
import { BaseRepository } from '../../../shared/repositories/base-repository.repository';
import { ActivityTemplateEmbedding } from '../entity/activity-template-embedding.entity';

export interface ActivityTemplateEmbeddingMatch {
  activityTemplateId: string;
  similarity: number;
}

const DEFAULT_LIMIT = 10;
const EMBEDDING_PARAM = 'embedding_vector';

@Injectable()
export class ActivityTemplateEmbeddingRepository extends BaseRepository<ActivityTemplateEmbedding> {
  constructor(connection: Connection) {
    super(connection, ActivityTemplateEmbedding);
  }

  async findNearestByEmbedding(
    embedding: number[],
    limit: number = DEFAULT_LIMIT,
    options?: { activityType?: string },
  ): Promise<ActivityTemplateEmbeddingMatch[]> {
    if (!embedding?.length) {
      return [];
    }

    const sanitizedEmbedding = embedding.map((value) => {
      const num = Number(value);
      if (!Number.isFinite(num)) {
        throw new Error('Invalid embedding vector: contains non-finite values');
      }
      return num;
    });

    const sanitizedLimit = limit && limit > 0 ? limit : DEFAULT_LIMIT;
    const vectorLiteral = `[${sanitizedEmbedding.join(',')}]`;

    let queryBuilder = this.orm
      .createQueryBuilder('embedding')
      .select('embedding.activity_template_id', 'activityTemplateId')
      .addSelect('1 - (embedding.embedding <=> :embedding_vector)', 'similarity')
      .orderBy('embedding.embedding <=> :embedding_vector', 'ASC')
      .take(sanitizedLimit)
      .setParameters({ [EMBEDDING_PARAM]: vectorLiteral });

    if (options?.activityType) {
      queryBuilder = queryBuilder
        .innerJoin('embedding.activity_template', 'template')
        .where('template.activity_type = :activityType', {
          activityType: options.activityType,
        });
    }

    const rawEmbeddings = await queryBuilder.getRawMany<{
      activityTemplateId: string;
      similarity: string | number;
    }>();

    return rawEmbeddings.map(({ activityTemplateId, similarity }) => ({
      activityTemplateId,
      similarity: typeof similarity === 'number' ? similarity : parseFloat(similarity),
    }));
  }
}
