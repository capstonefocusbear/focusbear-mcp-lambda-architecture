import { Test, TestingModule } from '@nestjs/testing';
import { ActivityTemplateGoalEmbeddingService } from './activity-template-goal-embedding.service';
import { ActivityTemplateRetrieverService } from './activity-template-retriever.service';
import { ActivityTemplateEmbeddingRepository } from '../repository/activity-template-embedding.repository';

describe(ActivityTemplateRetrieverService.name, () => {
  let service: ActivityTemplateRetrieverService;

  const goalEmbeddingServiceMock = {
    generateEmbedding: jest.fn(),
  };

  const embeddingRepositoryMock = {
    findNearestByEmbedding: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivityTemplateRetrieverService,
        {
          provide: ActivityTemplateGoalEmbeddingService,
          useValue: goalEmbeddingServiceMock,
        },
        {
          provide: ActivityTemplateEmbeddingRepository,
          useValue: embeddingRepositoryMock,
        },
      ],
    }).compile();

    service = module.get(ActivityTemplateRetrieverService);
    goalEmbeddingServiceMock.generateEmbedding.mockReset();
    embeddingRepositoryMock.findNearestByEmbedding.mockReset();
  });

  it('delegates to embedding repository when embedding is available', async () => {
    const expectedResult = [
      {
        activityTemplateId: 'activity-1',
        similarity: 0.89,
      },
    ];

    goalEmbeddingServiceMock.generateEmbedding.mockResolvedValue([0.1, 0.2]);
    embeddingRepositoryMock.findNearestByEmbedding.mockResolvedValue(expectedResult);

    const result = await service.retrieveByGoal('Get buffed', 5);

    expect(goalEmbeddingServiceMock.generateEmbedding).toHaveBeenCalledWith('Get buffed');
    expect(embeddingRepositoryMock.findNearestByEmbedding).toHaveBeenCalledWith([0.1, 0.2], 5);
    expect(result).toEqual(expectedResult);
  });

  it('returns empty matches when embedding service returns empty vector', async () => {
    goalEmbeddingServiceMock.generateEmbedding.mockResolvedValue([]);

    const result = await service.retrieveByGoal('unknown goal', 3);

    expect(goalEmbeddingServiceMock.generateEmbedding).toHaveBeenCalledWith('unknown goal');
    expect(embeddingRepositoryMock.findNearestByEmbedding).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });
});
