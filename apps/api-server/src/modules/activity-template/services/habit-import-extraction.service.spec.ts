import { Test } from '@nestjs/testing';
import { SENTRY_TOKEN } from '@ntegral/nestjs-sentry';
import { OpenAIService } from '@app/openai';
import { HabitImportExtractionService } from './habit-import-extraction.service';
import { ActivityTemplateRetrieverService } from './activity-template-retriever.service';
import { RoutineSuggestionGeneratorService } from './routine-suggestion-generator.service';
import { ActivityTemplateRepository } from '../repository/activity-template.repository';
import { HabitLibraryRequestRepository } from '../repository/habit-library-request.repository';
import { SentryServiceMock } from '../../../../test/mocks';
import { ExtractedHabit, HabitSuggestionResult } from '../dto/import-habits-from-media.dto';

describe('HabitImportExtractionService', () => {
  let service: HabitImportExtractionService;

  const openAIServiceMock = {
    extractHabitsFromImage: jest.fn(),
    extractHabitsFromTranscript: jest.fn(),
  };

  const activityTemplateRetrieverServiceMock = {
    retrieveByText: jest.fn(),
  };

  const routineSuggestionGeneratorServiceMock = {
    generateSuggestions: jest.fn(),
  };

  const activityTemplateRepositoryMock = {
    orm: {
      find: jest.fn(),
    },
  };

  const habitLibraryRequestRepositoryMock = {
    logRequests: jest.fn(),
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        HabitImportExtractionService,
        {
          provide: OpenAIService,
          useValue: openAIServiceMock,
        },
        {
          provide: ActivityTemplateRetrieverService,
          useValue: activityTemplateRetrieverServiceMock,
        },
        {
          provide: RoutineSuggestionGeneratorService,
          useValue: routineSuggestionGeneratorServiceMock,
        },
        {
          provide: ActivityTemplateRepository,
          useValue: activityTemplateRepositoryMock,
        },
        {
          provide: HabitLibraryRequestRepository,
          useValue: habitLibraryRequestRepositoryMock,
        },
        {
          provide: SENTRY_TOKEN,
          useValue: SentryServiceMock,
        },
      ],
    }).compile();

    service = moduleRef.get<HabitImportExtractionService>(HabitImportExtractionService);
    jest.clearAllMocks();
  });

  describe('extractHabitsFromImage', () => {
    it('should extract habits from image buffer', async () => {
      const imageBuffer = 'data:image/png;base64,abc123';
      const expectedHabits: ExtractedHabit[] = [
        { name: 'Morning meditation', description: 'Meditate for 10 minutes', estimatedDurationMinutes: 10, category: 'meditation' },
        { name: 'Exercise', description: 'Morning workout', estimatedDurationMinutes: 30, category: 'exercise' },
      ];

      openAIServiceMock.extractHabitsFromImage.mockResolvedValueOnce(expectedHabits);

      const result = await service.extractHabitsFromImage(imageBuffer);

      expect(openAIServiceMock.extractHabitsFromImage).toHaveBeenCalledWith(imageBuffer);
      expect(result).toEqual(expectedHabits);
    });

    it('should throw error when image extraction fails', async () => {
      const imageBuffer = 'data:image/png;base64,abc123';
      const error = new Error('OpenAI API error');

      openAIServiceMock.extractHabitsFromImage.mockRejectedValueOnce(error);

      await expect(service.extractHabitsFromImage(imageBuffer)).rejects.toThrow('OpenAI API error');
      expect(SentryServiceMock.captureException).toHaveBeenCalledWith(error, { level: 'error' });
    });
  });

  describe('extractHabitsFromTranscript', () => {
    it('should extract habits from transcript', async () => {
      const transcript = 'I meditate for 10 minutes every morning and then exercise for 30 minutes';
      const expectedHabits: ExtractedHabit[] = [
        { name: 'Morning meditation', description: 'Meditate for 10 minutes', estimatedDurationMinutes: 10, category: 'meditation' },
        { name: 'Morning exercise', description: 'Exercise for 30 minutes', estimatedDurationMinutes: 30, category: 'exercise' },
      ];

      openAIServiceMock.extractHabitsFromTranscript.mockResolvedValueOnce(expectedHabits);

      const result = await service.extractHabitsFromTranscript(transcript);

      expect(openAIServiceMock.extractHabitsFromTranscript).toHaveBeenCalledWith(transcript);
      expect(result).toEqual(expectedHabits);
    });

    it('should throw error when transcript extraction fails', async () => {
      const transcript = 'Some transcript';
      const error = new Error('OpenAI API error');

      openAIServiceMock.extractHabitsFromTranscript.mockRejectedValueOnce(error);

      await expect(service.extractHabitsFromTranscript(transcript)).rejects.toThrow('OpenAI API error');
      expect(SentryServiceMock.captureException).toHaveBeenCalledWith(error, { level: 'error' });
    });
  });

  describe('matchExtractedHabits', () => {
    const mockHabit: ExtractedHabit = {
      name: 'Morning meditation',
      description: 'Meditate for 10 minutes',
      estimatedDurationMinutes: 10,
      category: 'meditation',
    };

    const mockTemplate = {
      id: 'template-1',
      name: 'Mindfulness Meditation',
      description: 'A guided meditation session',
      activity_type: 'mindfulness',
      duration_seconds: 600,
      tags: [],
    };

    it('should return unmatched habit when no RAG candidates found', async () => {
      activityTemplateRetrieverServiceMock.retrieveByText.mockResolvedValueOnce([]);

      const result = await service.matchExtractedHabits([mockHabit]);

      expect(result).toHaveLength(1);
      expect(result[0].matched).toBe(false);
      expect(result[0].extractedHabit).toEqual(mockHabit);
      expect(result[0].suggestedHabit).toEqual(mockHabit);
    });

    it('should return matched habit when RAG and LLM find a match', async () => {
      activityTemplateRetrieverServiceMock.retrieveByText.mockResolvedValueOnce([
        { activityTemplateId: 'template-1', similarity: 0.8 },
      ]);

      activityTemplateRepositoryMock.orm.find.mockResolvedValueOnce([mockTemplate]);

      routineSuggestionGeneratorServiceMock.generateSuggestions.mockResolvedValueOnce({
        accepted: [
          {
            habitId: 'template-1',
            name: 'Mindfulness Meditation',
            description: 'A guided meditation session',
            matchScore: 0.85,
            justification: 'Very similar meditation activity',
            template: mockTemplate,
          },
        ],
        rejectedCount: 0,
        parsedCount: 1,
        minScoreApplied: 0.5,
      });

      const result = await service.matchExtractedHabits([mockHabit]);

      expect(result).toHaveLength(1);
      expect(result[0].matched).toBe(true);
      expect(result[0].matchedTemplate).toEqual({
        id: 'template-1',
        name: 'Mindfulness Meditation',
        description: 'A guided meditation session',
        activityType: 'mindfulness',
        durationSeconds: 600,
        matchScore: 0.85,
        justification: 'Very similar meditation activity',
      });
    });

    it('should return unmatched habit when LLM rejects all candidates', async () => {
      activityTemplateRetrieverServiceMock.retrieveByText.mockResolvedValueOnce([
        { activityTemplateId: 'template-1', similarity: 0.6 },
      ]);

      activityTemplateRepositoryMock.orm.find.mockResolvedValueOnce([mockTemplate]);

      routineSuggestionGeneratorServiceMock.generateSuggestions.mockResolvedValueOnce({
        accepted: [],
        rejectedCount: 1,
        parsedCount: 1,
        minScoreApplied: 0.5,
      });

      const result = await service.matchExtractedHabits([mockHabit]);

      expect(result).toHaveLength(1);
      expect(result[0].matched).toBe(false);
      expect(result[0].suggestedHabit).toEqual(mockHabit);
    });

    it('should handle errors gracefully and return unmatched habit', async () => {
      activityTemplateRetrieverServiceMock.retrieveByText.mockRejectedValueOnce(new Error('RAG error'));

      const result = await service.matchExtractedHabits([mockHabit]);

      expect(result).toHaveLength(1);
      expect(result[0].matched).toBe(false);
      expect(result[0].extractedHabit).toEqual(mockHabit);
    });

    it('should use custom minMatchScore when provided', async () => {
      activityTemplateRetrieverServiceMock.retrieveByText.mockResolvedValueOnce([
        { activityTemplateId: 'template-1', similarity: 0.8 },
      ]);

      activityTemplateRepositoryMock.orm.find.mockResolvedValueOnce([mockTemplate]);

      routineSuggestionGeneratorServiceMock.generateSuggestions.mockResolvedValueOnce({
        accepted: [],
        rejectedCount: 1,
        parsedCount: 1,
        minScoreApplied: 0.9,
      });

      await service.matchExtractedHabits([mockHabit], { minMatchScore: 0.9 });

      expect(routineSuggestionGeneratorServiceMock.generateSuggestions).toHaveBeenCalledWith(
        'Morning meditation',
        expect.any(Array),
        { limit: 1, minMatchScore: 0.9 },
      );
    });
  });

  describe('logUnmatchedHabits', () => {
    const metadata = {
      asyncTaskId: 'task-123',
      mediaType: 'image' as const,
      routineType: 'morning',
    };

    it('should log unmatched habits to repository', async () => {
      const results: HabitSuggestionResult[] = [
        {
          extractedHabit: { name: 'Custom habit', description: 'My custom habit', estimatedDurationMinutes: 15, category: 'other' },
          matched: false,
          suggestedHabit: { name: 'Custom habit', description: 'My custom habit', estimatedDurationMinutes: 15, category: 'other' },
        },
      ];

      habitLibraryRequestRepositoryMock.logRequests.mockResolvedValueOnce(undefined);

      await service.logUnmatchedHabits(results, 'user-123', metadata);

      expect(habitLibraryRequestRepositoryMock.logRequests).toHaveBeenCalledWith([
        expect.objectContaining({
          userId: 'user-123',
          goal: 'habit_import',
          habitName: 'Custom habit',
          habitDescription: 'My custom habit',
          routineType: 'morning',
          durationMinutes: 15,
          justification: 'No matching habit in library - imported from user screenshot/audio',
          requestMetadata: expect.objectContaining({
            source: 'habit_import',
            mediaType: 'image',
            asyncTaskId: 'task-123',
            extractedCategory: 'other',
          }),
        }),
      ]);
    });

    it('should not log anything when all habits are matched', async () => {
      const results: HabitSuggestionResult[] = [
        {
          extractedHabit: { name: 'Meditation', category: 'meditation' },
          matched: true,
          matchedTemplate: { id: 'template-1', name: 'Meditation', matchScore: 0.9 } as any,
        },
      ];

      await service.logUnmatchedHabits(results, 'user-123', metadata);

      expect(habitLibraryRequestRepositoryMock.logRequests).not.toHaveBeenCalled();
    });

    it('should handle logging errors gracefully without throwing', async () => {
      const results: HabitSuggestionResult[] = [
        {
          extractedHabit: { name: 'Custom habit', category: 'other' },
          matched: false,
          suggestedHabit: { name: 'Custom habit', category: 'other' },
        },
      ];

      habitLibraryRequestRepositoryMock.logRequests.mockRejectedValueOnce(new Error('DB error'));

      // Should not throw
      await expect(service.logUnmatchedHabits(results, 'user-123', metadata)).resolves.not.toThrow();

      expect(SentryServiceMock.captureException).toHaveBeenCalled();
    });

    it('should use default routine type when not provided', async () => {
      const results: HabitSuggestionResult[] = [
        {
          extractedHabit: { name: 'Custom habit', category: 'other' },
          matched: false,
          suggestedHabit: { name: 'Custom habit', category: 'other' },
        },
      ];

      const metadataWithoutRoutineType = {
        asyncTaskId: 'task-123',
        mediaType: 'audio' as const,
      };

      habitLibraryRequestRepositoryMock.logRequests.mockResolvedValueOnce(undefined);

      await service.logUnmatchedHabits(results, 'user-123', metadataWithoutRoutineType);

      expect(habitLibraryRequestRepositoryMock.logRequests).toHaveBeenCalledWith([
        expect.objectContaining({
          routineType: 'morning',
        }),
      ]);
    });
  });
});
