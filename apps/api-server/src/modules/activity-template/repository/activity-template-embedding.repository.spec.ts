import { Test } from '@nestjs/testing';
import { Connection, QueryBuilder } from 'typeorm';
import { ActivityTemplateEmbeddingRepository } from './activity-template-embedding.repository';
import { ActivityTemplateEmbedding } from '../entity/activity-template-embedding.entity';

describe('ActivityTemplateEmbeddingRepository', () => {
  let repository: ActivityTemplateEmbeddingRepository;
  let mockConnection: any;
  let mockRepository: any;
  let mockQueryBuilder: any;

  beforeEach(async () => {
    mockQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      setParameters: jest.fn().mockReturnThis(),
      getRawMany: jest.fn(),
    } as unknown as jest.Mocked<QueryBuilder<ActivityTemplateEmbedding>>;

    mockRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    };

    mockConnection = {
      getRepository: jest.fn().mockReturnValue(mockRepository),
    } as unknown as jest.Mocked<Connection>;

    const moduleRef = await Test.createTestingModule({
      providers: [
        ActivityTemplateEmbeddingRepository,
        {
          provide: Connection,
          useValue: mockConnection,
        },
      ],
    }).compile();

    repository = moduleRef.get(ActivityTemplateEmbeddingRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('builds similarity query with provided limit', async () => {
    const rawResults = [
      {
        activityTemplateId: 'activity-1',
        similarity: '0.87',
      },
    ];

    mockQueryBuilder.getRawMany.mockResolvedValue(rawResults);

    const result = await repository.findNearestByEmbedding([0.1, -0.2, 0.3], 5);

    expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith('embedding');
    expect(mockQueryBuilder.select).toHaveBeenCalledWith('embedding.activity_template_id', 'activityTemplateId');
    expect(mockQueryBuilder.addSelect).toHaveBeenCalledWith(
      '1 - (embedding.embedding <=> :embedding_vector)',
      'similarity',
    );
    expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('embedding.embedding <=> :embedding_vector', 'ASC');
    expect(mockQueryBuilder.take).toHaveBeenCalledWith(5);
    expect(mockQueryBuilder.setParameters).toHaveBeenCalledWith({
      embedding_vector: '[0.1,-0.2,0.3]',
    });
    expect(result).toEqual([
      {
        activityTemplateId: 'activity-1',
        similarity: 0.87,
      },
    ]);
  });

  it('uses default limit when not provided', async () => {
    mockQueryBuilder.getRawMany.mockResolvedValue([]);

    await repository.findNearestByEmbedding([0.6, 0.7, 0.8], undefined);

    expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
  });

  it('throws error when embedding contains non-finite values', async () => {
    await expect(repository.findNearestByEmbedding([0.1, NaN, 0.3], 5)).rejects.toThrow(
      'Invalid embedding vector: contains non-finite values',
    );
  });

  it('throws error when embedding contains Infinity', async () => {
    await expect(repository.findNearestByEmbedding([0.1, Infinity, 0.3], 5)).rejects.toThrow(
      'Invalid embedding vector: contains non-finite values',
    );
  });

  it('throws error when embedding contains non-numeric values', async () => {
    await expect(repository.findNearestByEmbedding([0.1, 'malicious' as any, 0.3], 5)).rejects.toThrow(
      'Invalid embedding vector: contains non-finite values',
    );
  });
});
