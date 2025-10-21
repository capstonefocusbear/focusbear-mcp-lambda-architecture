import { Test, TestingModule } from '@nestjs/testing';
import { SENTRY_TOKEN } from '@ntegral/nestjs-sentry';
import { OpenAIService } from '@app/openai';
import { RoutineSuggestionGeneratorService, RoutineSuggestionCandidate } from './routine-suggestion-generator.service';
import { ActivityTemplate } from '../entity/activity-template.entity';
import { ActivityType } from '../../activity/domain/activity-type.enum';
import { OpenAIServiceMock, SentryServiceMock } from '../../../../test/mocks';

describe(RoutineSuggestionGeneratorService.name, () => {
  let service: RoutineSuggestionGeneratorService;

  const buildTemplate = (overrides: Partial<ActivityTemplate> = {}): ActivityTemplate =>
    ({
      id: 'template-1',
      activity_type: ActivityType.morning,
      activity_data: {
        name: 'Morning Stretch',
        text_instructions: 'Stretch your body for 5 minutes.',
      },
      tags: [
        {
          tags: ['fitness', 'mobility'],
          activity_template_id: 'template-1',
          id: 'tag-1',
        },
      ],
      duration_seconds: 300,
      ...overrides,
    } as ActivityTemplate);

  const buildCandidate = (template: ActivityTemplate, similarity = 0.85): RoutineSuggestionCandidate => ({
    template,
    similarity,
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoutineSuggestionGeneratorService,
        {
          provide: OpenAIService,
          useValue: OpenAIServiceMock,
        },
        {
          provide: SENTRY_TOKEN,
          useValue: SentryServiceMock,
        },
      ],
    }).compile();

    service = module.get<RoutineSuggestionGeneratorService>(RoutineSuggestionGeneratorService);
  });

  it('returns parsed suggestions when OpenAI response contains valid JSON', async () => {
    const template = buildTemplate();
    const candidate = buildCandidate(template, 0.92);
    const openAIResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify([
              {
                habitId: template.id,
                justification: 'Supports muscle growth.',
                matchScore: 0.91,
              },
            ]),
          },
        },
      ],
    };

    OpenAIServiceMock.createChatCompletion.mockResolvedValue(openAIResponse);

    const result = await service.generateSuggestions('Get buffed', [candidate]);

    expect(OpenAIServiceMock.createChatCompletion).toHaveBeenCalled();
    expect(result).toEqual([
      {
        habitId: template.id,
        justification: 'Supports muscle growth.',
        matchScore: 0.91,
        template,
      },
    ]);
  });

  it('falls back to similarity ranking when OpenAI response is invalid JSON', async () => {
    const template = buildTemplate();
    const candidate = buildCandidate(template, 0.88);
    OpenAIServiceMock.createChatCompletion.mockResolvedValue({
      choices: [{ message: { content: 'Not JSON' } }],
    });

    const result = await service.generateSuggestions('Get buffed', [candidate]);

    expect(result).toEqual([
      {
        habitId: template.id,
        justification: expect.stringContaining('High semantic match'),
        matchScore: 0.88,
        template,
      },
    ]);
  });
});
