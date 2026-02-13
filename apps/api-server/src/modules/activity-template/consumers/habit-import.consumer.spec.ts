import { Test } from '@nestjs/testing';
import { Job } from 'bull';
import { R2Service } from '@app/r2';
import { OpenAIService } from '@app/openai';
import { SENTRY_TOKEN } from '@app/observability';
import axios from 'axios';
import { HabitImportConsumer } from './habit-import.consumer';
import { AsyncTaskService } from '../../async-task/services/async-task.service';
import { AsyncTaskStatus } from '../../async-task/domain/async-task-status.enum';
import { HabitImportExtractionService } from '../services/habit-import-extraction.service';
import { HabitImportJobData, ExtractedHabit, HabitSuggestionResult } from '../dto/import-habits-from-media.dto';
import { SentryServiceMock } from '../../../../test/mocks';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock openai/uploads
jest.mock('openai/uploads', () => ({
  toFile: jest.fn().mockResolvedValue({ name: 'test-file.mp3' }),
}));

// Mock sharp
jest.mock('sharp', () => {
  const mockSharp = jest.fn(() => ({
    metadata: jest.fn().mockResolvedValue({ width: 1024, height: 768 }),
    resize: jest.fn().mockReturnThis(),
    png: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockResolvedValue(Buffer.from('upscaled-image')),
  }));
  return mockSharp;
});

describe('HabitImportConsumer', () => {
  let consumer: HabitImportConsumer;

  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  const asyncTaskServiceMock = {
    updateStatusWithMetadata: jest.fn(),
  };

  const habitImportExtractionServiceMock = {
    extractHabitsFromImage: jest.fn(),
    extractHabitsFromTranscript: jest.fn(),
    matchExtractedHabits: jest.fn(),
    matchExtractedHabitsWithTelemetry: jest.fn(),
    logUnmatchedHabits: jest.fn(),
  };

  const r2ServiceMock = {
    getPresignedUrl: jest.fn(),
  };

  const openAIServiceMock = {
    transcribeAudioToText: jest.fn(),
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        HabitImportConsumer,
        {
          provide: AsyncTaskService,
          useValue: asyncTaskServiceMock,
        },
        {
          provide: HabitImportExtractionService,
          useValue: habitImportExtractionServiceMock,
        },
        {
          provide: R2Service,
          useValue: r2ServiceMock,
        },
        {
          provide: OpenAIService,
          useValue: openAIServiceMock,
        },
        {
          provide: SENTRY_TOKEN,
          useValue: SentryServiceMock,
        },
      ],
    }).compile();

    consumer = moduleRef.get<HabitImportConsumer>(HabitImportConsumer);
    jest.clearAllMocks();
  });

  const buildJob = (overrides: Partial<HabitImportJobData> = {}): Job<HabitImportJobData> =>
    ({
      id: 'job-1',
      attemptsMade: 0,
      data: {
        asyncTaskId: 'task-123',
        userId: 'user-7',
        mediaKey: 'user-7-123456-habit-import.png',
        mediaType: 'image',
        routineDurationMinutes: 30,
        routineType: 'morning',
        requestHash: 'hash-abc',
        ...overrides,
      },
    } as Job<HabitImportJobData>);

  describe('processHabitImport - Image flow', () => {
    const mockExtractedHabits: ExtractedHabit[] = [
      { name: 'Morning meditation', description: 'Meditate', estimatedDurationMinutes: 10, category: 'meditation' },
      { name: 'Exercise', description: 'Workout', estimatedDurationMinutes: 30, category: 'exercise' },
    ];

    const mockResults: HabitSuggestionResult[] = [
      {
        extractedHabit: mockExtractedHabits[0],
        matched: true,
        matchedTemplate: {
          id: '11111111-1111-4111-8111-111111111111',
          name: 'Mindfulness Meditation',
          description: 'Guided meditation',
          activityType: 'morning',
          durationSeconds: 600,
          matchScore: 0.9,
          justification: 'Similar meditation activity',
        },
      },
      {
        extractedHabit: mockExtractedHabits[1],
        matched: false,
        suggestedHabit: mockExtractedHabits[1],
      },
    ];

    it('should process image and return matched/unmatched habits', async () => {
      const job = buildJob({ mediaType: 'image' });

      r2ServiceMock.getPresignedUrl.mockResolvedValueOnce('https://r2.example.com/image.png');
      mockedAxios.get.mockResolvedValueOnce({
        data: Buffer.from('fake-image-data'),
      });
      habitImportExtractionServiceMock.extractHabitsFromImage.mockResolvedValueOnce(mockExtractedHabits);
      habitImportExtractionServiceMock.matchExtractedHabitsWithTelemetry.mockResolvedValueOnce({
        results: mockResults,
        telemetry: {
          embeddingBatchCalls: 1,
          ragRetrieveMs: 10,
          ragTemplateFetchMs: 5,
          ragRerankMs: 8,
          rerankLlmCalls: 1,
          rerankShortcutAccepts: 0,
          rerankShortcutRejects: 0,
        },
      });
      habitImportExtractionServiceMock.logUnmatchedHabits.mockResolvedValueOnce(undefined);

      const result = await consumer.processHabitImport(job);

      // Verify status updates
      expect(asyncTaskServiceMock.updateStatusWithMetadata).toHaveBeenNthCalledWith(
        1,
        'task-123',
        AsyncTaskStatus.PROCESSING,
        expect.objectContaining({
          taskType: 'habit-import',
          userId: 'user-7',
          mediaKey: 'user-7-123456-habit-import.png',
          mediaType: 'image',
        }),
        expect.objectContaining({
          processingStarted: expect.any(Date),
        }),
      );

      // Verify image extraction was called with base64 data
      expect(habitImportExtractionServiceMock.extractHabitsFromImage).toHaveBeenCalledWith(
        expect.stringMatching(/^data:image\/png;base64,/),
      );

      // Verify matching was called with routineType option
      expect(habitImportExtractionServiceMock.matchExtractedHabitsWithTelemetry).toHaveBeenCalledWith(
        mockExtractedHabits,
        {
          routineType: 'morning',
        },
      );

      // Verify unmatched habits were logged
      expect(habitImportExtractionServiceMock.logUnmatchedHabits).toHaveBeenCalledWith(
        mockResults,
        'user-7',
        expect.objectContaining({
          asyncTaskId: 'task-123',
          mediaType: 'image',
          routineType: 'morning',
        }),
      );

      // Verify completion status
      expect(asyncTaskServiceMock.updateStatusWithMetadata).toHaveBeenLastCalledWith(
        'task-123',
        AsyncTaskStatus.COMPLETED,
        expect.any(Object),
        expect.objectContaining({
          processingCompleted: expect.any(Date),
          extractedCount: 2,
          matchedCount: 1,
          unmatchedCount: 1,
          result: expect.any(Array),
        }),
      );

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(
        expect.objectContaining({
          id: '11111111-1111-4111-8111-111111111111',
          name: 'Mindfulness Meditation',
          duration_seconds: 600,
          activity_type: 'morning',
          category: 'meditation',
          text_instructions: 'Guided meditation',
        }),
      );
      expect(result[1]).toEqual(
        expect.objectContaining({
          id: expect.stringMatching(UUID_REGEX),
          name: 'Exercise',
          duration_seconds: 1800,
          activity_type: 'morning',
          category: 'exercise',
          text_instructions: 'Workout',
        }),
      );
    });

    it('uses deterministic IDs for unmatched habits across retries', async () => {
      const job = buildJob({ mediaType: 'image', requestHash: 'stable-request-hash' });
      const unmatchedHabit: ExtractedHabit = {
        name: 'Custom stretch',
        description: 'Stretch after waking up',
        estimatedDurationMinutes: 8,
        category: 'mobility',
      };
      const unmatchedResults: HabitSuggestionResult[] = [
        {
          extractedHabit: unmatchedHabit,
          matched: false,
          suggestedHabit: unmatchedHabit,
        },
      ];

      r2ServiceMock.getPresignedUrl.mockResolvedValue('https://r2.example.com/image.png');
      mockedAxios.get.mockResolvedValue({
        data: Buffer.from('fake-image-data'),
      } as any);
      habitImportExtractionServiceMock.extractHabitsFromImage.mockResolvedValue([unmatchedHabit]);
      habitImportExtractionServiceMock.matchExtractedHabitsWithTelemetry.mockResolvedValue({
        results: unmatchedResults,
        telemetry: {
          embeddingBatchCalls: 1,
          ragRetrieveMs: 3,
          ragTemplateFetchMs: 0,
          ragRerankMs: 0,
          rerankLlmCalls: 0,
          rerankShortcutAccepts: 0,
          rerankShortcutRejects: 0,
        },
      });
      habitImportExtractionServiceMock.logUnmatchedHabits.mockResolvedValue(undefined);

      const firstRun = await consumer.processHabitImport(job);
      const secondRun = await consumer.processHabitImport(job);

      expect(firstRun).toHaveLength(1);
      expect(secondRun).toHaveLength(1);
      expect(firstRun[0].id).toEqual(secondRun[0].id);
      expect(firstRun[0].id).toMatch(UUID_REGEX);
    });

    it('overrides matched activity type when routineType is provided', async () => {
      const job = buildJob({ mediaType: 'image', routineType: 'morning' });

      const overrideResults: HabitSuggestionResult[] = [
        {
          extractedHabit: mockExtractedHabits[0],
          matched: true,
          matchedTemplate: {
            id: '11111111-1111-4111-8111-111111111111',
            name: 'Mindfulness Meditation',
            description: 'Guided meditation',
            activityType: 'evening',
            durationSeconds: 600,
            matchScore: 0.9,
            justification: 'Similar meditation activity',
          },
        },
      ];

      r2ServiceMock.getPresignedUrl.mockResolvedValueOnce('https://r2.example.com/image.png');
      mockedAxios.get.mockResolvedValueOnce({
        data: Buffer.from('fake-image-data'),
      });
      habitImportExtractionServiceMock.extractHabitsFromImage.mockResolvedValueOnce([mockExtractedHabits[0]]);
      habitImportExtractionServiceMock.matchExtractedHabitsWithTelemetry.mockResolvedValueOnce({
        results: overrideResults,
        telemetry: {
          embeddingBatchCalls: 1,
          ragRetrieveMs: 10,
          ragTemplateFetchMs: 5,
          ragRerankMs: 8,
          rerankLlmCalls: 1,
          rerankShortcutAccepts: 0,
          rerankShortcutRejects: 0,
        },
      });
      habitImportExtractionServiceMock.logUnmatchedHabits.mockResolvedValueOnce(undefined);

      const result = await consumer.processHabitImport(job);

      expect(result).toEqual([
        expect.objectContaining({
          id: '11111111-1111-4111-8111-111111111111',
          name: 'Mindfulness Meditation',
          duration_seconds: 600,
          activity_type: 'morning',
          category: 'meditation',
          text_instructions: 'Guided meditation',
        }),
      ]);
    });

    it('should return empty array when no habits are extracted', async () => {
      const job = buildJob({ mediaType: 'image' });

      r2ServiceMock.getPresignedUrl.mockResolvedValueOnce('https://r2.example.com/image.png');
      mockedAxios.get.mockResolvedValueOnce({
        data: Buffer.from('fake-image-data'),
      });
      habitImportExtractionServiceMock.extractHabitsFromImage.mockResolvedValueOnce([]);

      const result = await consumer.processHabitImport(job);

      expect(asyncTaskServiceMock.updateStatusWithMetadata).toHaveBeenLastCalledWith(
        'task-123',
        AsyncTaskStatus.COMPLETED,
        expect.any(Object),
        expect.objectContaining({
          extractedCount: 0,
          matchedCount: 0,
          unmatchedCount: 0,
          result: [],
        }),
      );

      expect(habitImportExtractionServiceMock.matchExtractedHabitsWithTelemetry).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  describe('processHabitImport - Audio flow', () => {
    const mockExtractedHabits: ExtractedHabit[] = [
      { name: 'Reading', description: 'Read a book', estimatedDurationMinutes: 20, category: 'reading' },
    ];

    const mockResults: HabitSuggestionResult[] = [
      {
        extractedHabit: mockExtractedHabits[0],
        matched: true,
        matchedTemplate: {
          id: '22222222-2222-4222-8222-222222222222',
          name: 'Daily Reading',
          description: 'Read for 20 minutes',
          activityType: 'morning',
          durationSeconds: 1200,
          matchScore: 0.85,
          justification: 'Reading activity match',
        },
      },
    ];

    it('should process audio, transcribe, and return matched habits', async () => {
      const job = buildJob({
        mediaType: 'audio',
        mediaKey: 'user-7-123456-habit-import.mp3',
      });

      r2ServiceMock.getPresignedUrl.mockResolvedValueOnce('https://r2.example.com/audio.mp3');
      mockedAxios.get.mockResolvedValueOnce({
        data: Buffer.from('fake-audio-data'),
      });
      openAIServiceMock.transcribeAudioToText.mockResolvedValueOnce('I read for 20 minutes every day');
      habitImportExtractionServiceMock.extractHabitsFromTranscript.mockResolvedValueOnce(mockExtractedHabits);
      habitImportExtractionServiceMock.matchExtractedHabitsWithTelemetry.mockResolvedValueOnce({
        results: mockResults,
        telemetry: {
          embeddingBatchCalls: 1,
          ragRetrieveMs: 10,
          ragTemplateFetchMs: 5,
          ragRerankMs: 8,
          rerankLlmCalls: 1,
          rerankShortcutAccepts: 0,
          rerankShortcutRejects: 0,
        },
      });
      habitImportExtractionServiceMock.logUnmatchedHabits.mockResolvedValueOnce(undefined);

      const result = await consumer.processHabitImport(job);

      // Verify audio transcription was called
      expect(openAIServiceMock.transcribeAudioToText).toHaveBeenCalled();

      // Verify transcript extraction was called
      expect(habitImportExtractionServiceMock.extractHabitsFromTranscript).toHaveBeenCalledWith(
        'I read for 20 minutes every day',
      );

      expect(result).toEqual([
        expect.objectContaining({
          id: '22222222-2222-4222-8222-222222222222',
          name: 'Daily Reading',
          duration_seconds: 1200,
          activity_type: 'morning',
          category: 'reading',
          text_instructions: 'Read for 20 minutes',
        }),
      ]);
    });

    it('should throw error when transcript is empty', async () => {
      const job = buildJob({
        mediaType: 'audio',
        mediaKey: 'user-7-123456-habit-import.mp3',
      });

      r2ServiceMock.getPresignedUrl.mockResolvedValueOnce('https://r2.example.com/audio.mp3');
      mockedAxios.get.mockResolvedValueOnce({
        data: Buffer.from('fake-audio-data'),
      });
      openAIServiceMock.transcribeAudioToText.mockResolvedValueOnce('');

      await expect(consumer.processHabitImport(job)).rejects.toThrow('Empty transcript from audio');

      expect(asyncTaskServiceMock.updateStatusWithMetadata).toHaveBeenLastCalledWith(
        'task-123',
        AsyncTaskStatus.FAILED,
        expect.any(Object),
        expect.objectContaining({
          processingFailed: expect.any(Date),
          error: 'Empty transcript from audio',
        }),
      );
    });
  });

  describe('Error handling', () => {
    it('should mark task as failed and capture exception on R2 error', async () => {
      const job = buildJob({ mediaType: 'image' });
      const error = new Error('R2 connection failed');

      r2ServiceMock.getPresignedUrl.mockRejectedValueOnce(error);

      await expect(consumer.processHabitImport(job)).rejects.toThrow('R2 connection failed');

      expect(asyncTaskServiceMock.updateStatusWithMetadata).toHaveBeenLastCalledWith(
        'task-123',
        AsyncTaskStatus.FAILED,
        expect.objectContaining({
          taskType: 'habit-import',
          userId: 'user-7',
        }),
        expect.objectContaining({
          processingFailed: expect.any(Date),
          error: 'R2 connection failed',
        }),
      );

      expect(SentryServiceMock.captureException).toHaveBeenCalledWith(error, {
        level: 'error',
        extra: {
          userId: 'user-7',
          mediaKey: 'user-7-123456-habit-import.png',
          mediaType: 'image',
          asyncTaskId: 'task-123',
        },
      });
    });

    it('should handle extraction service errors', async () => {
      const job = buildJob({ mediaType: 'image' });

      r2ServiceMock.getPresignedUrl.mockResolvedValueOnce('https://r2.example.com/image.png');
      mockedAxios.get.mockResolvedValueOnce({
        data: Buffer.from('fake-image-data'),
      });
      habitImportExtractionServiceMock.extractHabitsFromImage.mockRejectedValueOnce(new Error('Vision API error'));

      await expect(consumer.processHabitImport(job)).rejects.toThrow('Vision API error');

      expect(asyncTaskServiceMock.updateStatusWithMetadata).toHaveBeenLastCalledWith(
        'task-123',
        AsyncTaskStatus.FAILED,
        expect.any(Object),
        expect.objectContaining({
          error: 'Vision API error',
        }),
      );
    });

    it('should handle matching service errors', async () => {
      const job = buildJob({ mediaType: 'image' });
      const mockExtractedHabits = [{ name: 'Test', category: 'other' }];

      r2ServiceMock.getPresignedUrl.mockResolvedValueOnce('https://r2.example.com/image.png');
      mockedAxios.get.mockResolvedValueOnce({
        data: Buffer.from('fake-image-data'),
      });
      habitImportExtractionServiceMock.extractHabitsFromImage.mockResolvedValueOnce(mockExtractedHabits);
      habitImportExtractionServiceMock.matchExtractedHabitsWithTelemetry.mockRejectedValueOnce(
        new Error('RAG service error'),
      );

      await expect(consumer.processHabitImport(job)).rejects.toThrow('RAG service error');

      expect(asyncTaskServiceMock.updateStatusWithMetadata).toHaveBeenLastCalledWith(
        'task-123',
        AsyncTaskStatus.FAILED,
        expect.any(Object),
        expect.objectContaining({
          error: 'RAG service error',
        }),
      );
    });
  });
});
