import { Test, TestingModule } from '@nestjs/testing';
import { SENTRY_TOKEN } from '@app/observability';
import { OpenAIService, PromptCacheService } from '@app/openai';
import { RoutineSuggestionGeneratorService, RoutineSuggestionCandidate } from './routine-suggestion-generator.service';
import { ActivityTemplate } from '../entity/activity-template.entity';
import { ActivityType } from '../../activity/domain/activity-type.enum';
import { OpenAIServiceMock, SentryServiceMock } from '../../../../test/mocks';

describe(RoutineSuggestionGeneratorService.name, () => {
  let service: RoutineSuggestionGeneratorService;
  const promptCacheServiceMock = {
    getPrompt: jest.fn(),
  } as unknown as jest.Mocked<PromptCacheService>;

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

  it('rejects suggestions when the LLM score falls below the dynamic threshold', async () => {
    promptCacheServiceMock.getPrompt.mockReturnValue(null);
    const template = buildTemplate();
    const candidate = buildCandidate(template, 0.52);
    OpenAIServiceMock.createChatCompletion.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              suggestions: [
                {
                  habitId: template.id,
                  justification: 'Too generic.',
                  matchScore: 0.48,
                },
              ],
            }),
          },
        },
      ],
    });

    const result = await service.generateSuggestions('Light cardio', [candidate]);

    expect(result).toEqual({
      accepted: [],
      rejectedCount: 1,
      parsedCount: 1,
      minScoreApplied: 0.5,
    });
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    promptCacheServiceMock.getPrompt.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoutineSuggestionGeneratorService,
        {
          provide: OpenAIService,
          useValue: OpenAIServiceMock,
        },
        {
          provide: PromptCacheService,
          useValue: promptCacheServiceMock,
        },
        {
          provide: SENTRY_TOKEN,
          useValue: SentryServiceMock,
        },
      ],
    }).compile();

    service = module.get<RoutineSuggestionGeneratorService>(RoutineSuggestionGeneratorService);
  });

  it('returns parsed suggestions with AI-provided name when OpenAI response contains valid JSON', async () => {
    promptCacheServiceMock.getPrompt.mockReturnValue(null);
    const template = buildTemplate();
    const candidate = buildCandidate(template, 0.69);
    const openAIResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              suggestions: [
                {
                  habitId: template.id,
                  name: 'Goal-Aligned Morning Stretch',
                  justification: 'Supports muscle growth.',
                  matchScore: 0.91,
                },
              ],
            }),
          },
        },
      ],
    };

    OpenAIServiceMock.createChatCompletion.mockResolvedValue(openAIResponse);

    const result = await service.generateSuggestions('Get buffed', [candidate]);

    expect(OpenAIServiceMock.createChatCompletion).toHaveBeenCalled();
    expect(result).toEqual({
      accepted: [
        {
          habitId: template.id,
          name: 'Goal-Aligned Morning Stretch',
          description: template.activity_data?.text_instructions,
          justification: 'Supports muscle growth.',
          matchScore: 0.83,
          template,
        },
      ],
      rejectedCount: 0,
      parsedCount: 1,
      minScoreApplied: 0.5,
    });
  });

  it('short-circuits to acceptance when top similarity is very high', async () => {
    const template = buildTemplate();
    const candidate = buildCandidate(template, 0.92);

    const result = await service.generateSuggestions('Improve mobility', [candidate], { includeTelemetry: true });

    expect(OpenAIServiceMock.createChatCompletion).not.toHaveBeenCalled();
    expect(result.accepted).toHaveLength(1);
    expect(result.telemetry).toEqual(
      expect.objectContaining({
        evaluationPath: 'shortcut_accept',
        llmInvoked: false,
        shortcutAccepted: true,
      }),
    );
  });

  it('short-circuits to rejection when top similarity is very low', async () => {
    const template = buildTemplate();
    const candidate = buildCandidate(template, 0.2);

    const result = await service.generateSuggestions('Become a guitarist', [candidate], { includeTelemetry: true });

    expect(OpenAIServiceMock.createChatCompletion).not.toHaveBeenCalled();
    expect(result).toEqual({
      accepted: [],
      rejectedCount: 1,
      parsedCount: 0,
      minScoreApplied: 0.5,
      telemetry: expect.objectContaining({
        evaluationPath: 'shortcut_reject',
        llmInvoked: false,
        shortcutRejected: true,
      }),
    });
  });

  it('builds chat completion messages using the shared prompt template when available', async () => {
    const template = buildTemplate();
    const candidate = buildCandidate(template, 0.69);
    promptCacheServiceMock.getPrompt.mockReturnValue('Prompt header\nUser goal: {{goal}}\nHabit options:\n{{habits}}');

    const openAIResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              suggestions: [
                {
                  habitId: template.id,
                  name: 'Refined Habit',
                  justification: 'Strong alignment.',
                  matchScore: 0.92,
                },
              ],
            }),
          },
        },
      ],
    };

    OpenAIServiceMock.createChatCompletion.mockResolvedValue(openAIResponse);

    const result = await service.generateSuggestions('Sharpen focus', [candidate]);

    expect(result.accepted).toHaveLength(1);

    const messages = OpenAIServiceMock.createChatCompletion.mock.calls[0][0] as any[];
    expect(messages).toHaveLength(1);
    expect(messages[0].role).toBe('system');
    expect(messages[0].content).toContain('Sharpen focus');
    expect(messages[0].content).toContain('Habit 1');
    expect(messages[0].content).not.toMatch(/{{\s*goal\s*}}/);
    expect(messages[0].content).not.toMatch(/{{\s*habits\s*}}/);
  });

  it('lowers the minimum match score when the top similarity is below the default threshold', async () => {
    promptCacheServiceMock.getPrompt.mockReturnValue(null);
    const template = buildTemplate();
    const candidate = buildCandidate(template, 0.6);
    OpenAIServiceMock.createChatCompletion.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              suggestions: [
                {
                  habitId: template.id,
                  justification: 'Solid alignment.',
                  matchScore: 0.59,
                },
              ],
            }),
          },
        },
      ],
    });

    const result = await service.generateSuggestions('Improve cardio', [candidate]);

    expect(result).toEqual({
      accepted: [
        {
          habitId: template.id,
          name: template.activity_data?.name,
          description: template.activity_data?.text_instructions,
          justification: 'Solid alignment.',
          matchScore: 0.59,
          template,
        },
      ],
      rejectedCount: 0,
      parsedCount: 1,
      minScoreApplied: 0.5,
    });

    const messages = OpenAIServiceMock.createChatCompletion.mock.calls[0][0] as any[];
    expect(messages[0].content).toContain('0.50');
  });

  it('filters out suggestions with match scores below the configured minimum', async () => {
    promptCacheServiceMock.getPrompt.mockReturnValue(null);
    const template = buildTemplate();
    const candidate = buildCandidate(template, 0.6);
    OpenAIServiceMock.createChatCompletion.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              suggestions: [
                {
                  habitId: template.id,
                  justification: 'Weak alignment.',
                  matchScore: 0.62,
                },
              ],
            }),
          },
        },
      ],
    });

    const result = await service.generateSuggestions('Get buffed', [candidate], { limit: 5, minMatchScore: 0.7 });

    expect(result).toEqual({
      accepted: [],
      rejectedCount: 1,
      parsedCount: 1,
      minScoreApplied: 0.7,
    });
  });

  it('caps LLM-provided match scores to retrieval similarity to avoid unrelated habits', async () => {
    promptCacheServiceMock.getPrompt.mockReturnValue(null);
    const template = buildTemplate({ activity_data: { name: 'Yoga Flow', text_instructions: 'Do yoga.' } });
    const candidate = buildCandidate(template, 0.3);
    OpenAIServiceMock.createChatCompletion.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              suggestions: [
                {
                  habitId: template.id,
                  justification: 'Helpful for posture.',
                  matchScore: 0.9,
                },
              ],
            }),
          },
        },
      ],
    });

    const result = await service.generateSuggestions('Become a guitarist', [candidate], { minMatchScore: 0.7 });

    expect(result).toEqual({
      accepted: [],
      rejectedCount: 1,
      parsedCount: 1,
      minScoreApplied: 0.7,
    });
    expect(OpenAIServiceMock.createChatCompletion).toHaveBeenCalled();
  });

  it('returns metadata when suggestions were parsed but rejected due to low score', async () => {
    promptCacheServiceMock.getPrompt.mockReturnValue(null);
    const template = buildTemplate();
    const candidate = buildCandidate(template, 0.52);
    OpenAIServiceMock.createChatCompletion.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              suggestions: [
                {
                  habitId: template.id,
                  justification: 'Weak alignment.',
                  matchScore: 0.48,
                },
              ],
            }),
          },
        },
      ],
    });

    const result = await service.generateSuggestions('Get buffed', [candidate], {
      limit: 5,
      minMatchScore: 0.7,
    });

    expect(result).toEqual({
      accepted: [],
      rejectedCount: 1,
      parsedCount: 1,
      minScoreApplied: 0.7,
    });
  });

  it('uses the default minimum score when no override is provided', async () => {
    const template = buildTemplate();
    const candidate = buildCandidate(template, 0.68);
    OpenAIServiceMock.createChatCompletion.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              suggestions: [
                {
                  habitId: template.id,
                  justification: 'Strong alignment.',
                  matchScore: 0.76,
                },
              ],
            }),
          },
        },
      ],
    });

    const result = await service.generateSuggestions('Improve mobility', [candidate]);

    expect(result.accepted).toHaveLength(1);
    expect(result.accepted[0]).toMatchObject({
      habitId: template.id,
      justification: 'Strong alignment.',
      matchScore: 0.73,
    });
    expect(result.minScoreApplied).toBe(0.5);
  });

  it('falls back to similarity ranking when OpenAI response is invalid JSON', async () => {
    const template = buildTemplate();
    const candidate = buildCandidate(template, 0.68);
    OpenAIServiceMock.createChatCompletion.mockResolvedValue({
      choices: [{ message: { content: 'Not JSON' } }],
    });

    const result = await service.generateSuggestions('Get buffed', [candidate]);

    expect(result).toEqual({
      accepted: [
        {
          habitId: template.id,
          name: template.activity_data?.name,
          description: template.activity_data?.text_instructions,
          justification: expect.stringContaining('High semantic match'),
          matchScore: 0.68,
          template,
        },
      ],
      rejectedCount: 0,
      parsedCount: 0,
      minScoreApplied: 0.5,
    });
  });

  it('generates brand new habits when no candidates are available', async () => {
    OpenAIServiceMock.createChatCompletion.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              habits: [
                {
                  name: 'Buff Morning Circuit',
                  emoji: '💪',
                  description: 'Strength routine tailored to building muscle.',
                  routineType: ActivityType.morning,
                  durationMinutes: 20,
                  justification: 'Directly builds strength for the goal.',
                },
              ],
            }),
          },
        },
      ],
    });

    const result = await service.generateNewHabits('Get buffed', {
      limit: 1,
      routineType: ActivityType.morning,
      routineDurationSeconds: 1200,
    });

    expect(OpenAIServiceMock.createChatCompletion).toHaveBeenCalled();
    expect(result).toEqual([
      {
        name: 'Buff Morning Circuit',
        emoji: '💪',
        description: 'Strength routine tailored to building muscle.',
        routineType: ActivityType.morning,
        durationMinutes: 20,
        justification: 'Directly builds strength for the goal.',
      },
    ]);
  });

  it('discards invalid generated emoji values (e.g. plain digits)', async () => {
    OpenAIServiceMock.createChatCompletion.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              habits: [
                {
                  name: 'Buff Morning Circuit',
                  emoji: '3',
                  description: 'Strength routine tailored to building muscle.',
                  routineType: ActivityType.morning,
                  durationMinutes: 20,
                  justification: 'Directly builds strength for the goal.',
                },
              ],
            }),
          },
        },
      ],
    });

    const result = await service.generateNewHabits('Get buffed', {
      limit: 1,
      routineType: ActivityType.morning,
      routineDurationSeconds: 1200,
    });

    expect(result).toEqual([
      {
        name: 'Buff Morning Circuit',
        emoji: undefined,
        description: 'Strength routine tailored to building muscle.',
        routineType: ActivityType.morning,
        durationMinutes: 20,
        justification: 'Directly builds strength for the goal.',
      },
    ]);
  });
});
