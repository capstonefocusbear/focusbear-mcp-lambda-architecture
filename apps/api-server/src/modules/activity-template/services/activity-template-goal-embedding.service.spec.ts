import { Test, TestingModule } from '@nestjs/testing';
import { OpenAIService } from '@app/openai';
import { ActivityTemplateGoalEmbeddingService } from './activity-template-goal-embedding.service';

describe(ActivityTemplateGoalEmbeddingService.name, () => {
  let service: ActivityTemplateGoalEmbeddingService;
  const openAIServiceMock = {
    createEmbedding: jest.fn(),
    createEmbeddings: jest.fn(),
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
    openAIServiceMock.createEmbeddings.mockReset();
  });

  it('returns OpenAI embedding for trimmed user goal', async () => {
    const expectedEmbedding = [0.1, 0.2];
    openAIServiceMock.createEmbedding.mockResolvedValue(expectedEmbedding);

    const result = await service.generateEmbedding('  Get buffed  ');

    expect(openAIServiceMock.createEmbedding).toHaveBeenCalledWith('Get buffed');
    expect(result).toEqual(expectedEmbedding);
  });

  it('adds routine and tags context when provided', async () => {
    const expectedEmbedding = [0.3, 0.4];
    openAIServiceMock.createEmbedding.mockResolvedValue(expectedEmbedding);

    const result = await service.generateEmbedding('Evening Brain Dump', {
      description: 'Capture thoughts before sleep.',
      tags: ['focus', 'reflection'],
      routineType: 'evening',
    });

    expect(openAIServiceMock.createEmbedding).toHaveBeenCalledWith(
      'Evening Brain Dump\nCapture thoughts before sleep.\nTags: focus, reflection\nRoutine: evening',
    );
    expect(result).toEqual(expectedEmbedding);
  });

  it('returns empty embedding when goal is blank', async () => {
    const result = await service.generateEmbedding('   ');

    expect(openAIServiceMock.createEmbedding).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it('returns ordered embeddings for batched goals', async () => {
    openAIServiceMock.createEmbeddings.mockResolvedValueOnce([
      [0.1, 0.2],
      [0.3, 0.4],
    ]);

    const result = await service.generateEmbeddings(['First', 'Second']);

    expect(openAIServiceMock.createEmbeddings).toHaveBeenCalledWith(['First', 'Second']);
    expect(result).toEqual([
      [0.1, 0.2],
      [0.3, 0.4],
    ]);
  });
});
