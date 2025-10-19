import { Test, TestingModule } from '@nestjs/testing';
import { OpenAIService } from '@app/openai';
import { ActivityTemplateGoalEmbeddingService } from './activity-template-goal-embedding.service';

describe(ActivityTemplateGoalEmbeddingService.name, () => {
  let service: ActivityTemplateGoalEmbeddingService;
  const openAIServiceMock = {
    createEmbedding: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivityTemplateGoalEmbeddingService,
        {
          provide: OpenAIService,
          useValue: openAIServiceMock,
        },
      ],
    }).compile();

    service = module.get(ActivityTemplateGoalEmbeddingService);
    openAIServiceMock.createEmbedding.mockReset();
  });

  it('returns OpenAI embedding for trimmed user goal', async () => {
    const expectedEmbedding = [0.1, 0.2];
    openAIServiceMock.createEmbedding.mockResolvedValue(expectedEmbedding);

    const result = await service.generateEmbedding('  Get buffed  ');

    expect(openAIServiceMock.createEmbedding).toHaveBeenCalledWith('Get buffed');
    expect(result).toEqual(expectedEmbedding);
  });

  it('returns empty embedding when goal is blank', async () => {
    const result = await service.generateEmbedding('   ');

    expect(openAIServiceMock.createEmbedding).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });
});
