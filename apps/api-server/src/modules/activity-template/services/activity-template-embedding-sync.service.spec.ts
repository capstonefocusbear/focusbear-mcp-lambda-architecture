import { Test, TestingModule } from '@nestjs/testing';
import { DEFAULT_EMBEDDING_MODEL } from '@app/openai/openai.constants';
import { SENTRY_TOKEN } from '@ntegral/nestjs-sentry';
import { ActivityTemplateEmbeddingSyncService } from './activity-template-embedding-sync.service';
import { ActivityTemplateRepository } from '../repository/activity-template.repository';
import { ActivityTemplateGoalEmbeddingService } from './activity-template-goal-embedding.service';
import { ActivityTemplateEmbeddingRepository } from '../repository/activity-template-embedding.repository';
import { ActivityType } from '../../activity/domain/activity-type.enum';
import { SentryServiceMock } from '../../../../test/mocks';

describe(ActivityTemplateEmbeddingSyncService.name, () => {
  let service: ActivityTemplateEmbeddingSyncService;

  const activityTemplateRepositoryMock = {
    getTemplatesForEmbeddingSync: jest.fn(),
  };

  const goalEmbeddingServiceMock = {
    generateEmbedding: jest.fn(),
  };

  const activityTemplateEmbeddingRepositoryMock = {
    upsert: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivityTemplateEmbeddingSyncService,
        {
          provide: ActivityTemplateRepository,
          useValue: activityTemplateRepositoryMock,
        },
        {
          provide: ActivityTemplateGoalEmbeddingService,
          useValue: goalEmbeddingServiceMock,
        },
        {
          provide: ActivityTemplateEmbeddingRepository,
          useValue: activityTemplateEmbeddingRepositoryMock,
        },
        {
          provide: SENTRY_TOKEN,
          useValue: SentryServiceMock,
        },
      ],
    }).compile();

    service = module.get<ActivityTemplateEmbeddingSyncService>(ActivityTemplateEmbeddingSyncService);
    jest.clearAllMocks();
    activityTemplateRepositoryMock.getTemplatesForEmbeddingSync.mockReset();
    goalEmbeddingServiceMock.generateEmbedding.mockReset();
    activityTemplateEmbeddingRepositoryMock.upsert.mockReset();
  });

  const buildTemplate = (overrides = {}) => ({
    id: 'template-1',
    activity_type: ActivityType.morning,
    activity_data: {
      name: 'Morning Stretch',
      text_instructions: 'Start with light stretches.',
    },
    tags: [{ tags: ['fitness', 'mobility'] }],
    ...overrides,
  });

  it('syncs embeddings for templates with generated vectors', async () => {
    const templates = [buildTemplate()];
    activityTemplateRepositoryMock.getTemplatesForEmbeddingSync.mockResolvedValue(templates);
    goalEmbeddingServiceMock.generateEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);
    activityTemplateEmbeddingRepositoryMock.upsert.mockResolvedValue(undefined);

    const result = await service.syncAll();

    expect(activityTemplateRepositoryMock.getTemplatesForEmbeddingSync).toHaveBeenCalled();
    expect(goalEmbeddingServiceMock.generateEmbedding).toHaveBeenCalledWith(expect.stringContaining('Morning Stretch'));
    expect(activityTemplateEmbeddingRepositoryMock.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        activity_template_id: 'template-1',
        embedding: [0.1, 0.2, 0.3],
        text_source: expect.stringContaining('fitness'),
        metadata: {
          tags: ['fitness', 'mobility'],
          activityType: ActivityType.morning,
        },
        model_version: DEFAULT_EMBEDDING_MODEL,
      }),
      ['activity_template_id'],
    );
    expect(result).toEqual({
      processed: 1,
      upserted: 1,
      skipped: 0,
      errors: 0,
    });
  });

  it('skips templates when embedding service returns empty vector', async () => {
    activityTemplateRepositoryMock.getTemplatesForEmbeddingSync.mockResolvedValue([buildTemplate()]);
    goalEmbeddingServiceMock.generateEmbedding.mockResolvedValue([]);

    const result = await service.syncAll();

    expect(activityTemplateEmbeddingRepositoryMock.upsert).not.toHaveBeenCalled();
    expect(result).toEqual({
      processed: 1,
      upserted: 0,
      skipped: 1,
      errors: 0,
    });
  });

  it('continues syncing when embedding generation fails for a template', async () => {
    activityTemplateRepositoryMock.getTemplatesForEmbeddingSync.mockResolvedValue([
      buildTemplate({ id: 'template-1' }),
      buildTemplate({ id: 'template-2' }),
    ]);
    goalEmbeddingServiceMock.generateEmbedding
      .mockRejectedValueOnce(new Error('OpenAI error'))
      .mockResolvedValueOnce([0.5, 0.6]);

    const result = await service.syncAll();

    expect(goalEmbeddingServiceMock.generateEmbedding).toHaveBeenCalledTimes(2);
    expect(activityTemplateEmbeddingRepositoryMock.upsert).toHaveBeenCalledTimes(1);
    expect(activityTemplateEmbeddingRepositoryMock.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ activity_template_id: 'template-2' }),
      ['activity_template_id'],
    );
    expect(result).toEqual({
      processed: 2,
      upserted: 1,
      skipped: 0,
      errors: 1,
    });
  });
});
