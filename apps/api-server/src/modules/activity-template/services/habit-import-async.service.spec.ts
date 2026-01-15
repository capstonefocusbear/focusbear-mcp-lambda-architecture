import { Test } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { Queue } from 'bull';
import { SENTRY_TOKEN } from '@app/observability';
import { HabitImportAsyncService } from './habit-import-async.service';
import { AsyncTaskService } from '../../async-task/services/async-task.service';
import { BullQueues, BullWorkers } from '../../../shared/utils/constants';
import { HabitImportUploadedDto } from '../dto/import-habits-from-media.dto';
import { SentryServiceMock } from '../../../../test/mocks';

describe('HabitImportAsyncService', () => {
  let service: HabitImportAsyncService;

  const asyncTaskServiceMock = {
    createAsyncTask: jest.fn(),
  } as unknown as jest.Mocked<AsyncTaskService>;

  const queueMock = {
    add: jest.fn(),
  } as unknown as jest.Mocked<Queue>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        HabitImportAsyncService,
        {
          provide: AsyncTaskService,
          useValue: asyncTaskServiceMock,
        },
        {
          provide: getQueueToken(BullQueues.HABIT_IMPORT),
          useValue: queueMock,
        },
        {
          provide: SENTRY_TOKEN,
          useValue: SentryServiceMock,
        },
      ],
    }).compile();

    service = moduleRef.get<HabitImportAsyncService>(HabitImportAsyncService);
    jest.clearAllMocks();
  });

  describe('enqueueHabitImport', () => {
    it('should enqueue habit import job for image', async () => {
      const dto: HabitImportUploadedDto = {
        mediaKey: 'user-123-1234567890-habit-import.png',
        mediaType: 'image',
        routineDurationMinutes: 30,
        routineType: 'morning',
      };

      asyncTaskServiceMock.createAsyncTask.mockResolvedValueOnce({ id: 'task-1', metadata: {} } as any);

      const result = await service.enqueueHabitImport(dto, 'user-123', 'api');

      expect(asyncTaskServiceMock.createAsyncTask).toHaveBeenCalledWith({
        metadata: expect.objectContaining({
          taskType: 'habit-import',
          userId: 'user-123',
          mediaType: 'image',
          mediaKey: 'user-123-1234567890-habit-import.png',
          routineDurationMinutes: 30,
          routineType: 'morning',
          source: 'api',
        }),
      });

      expect(queueMock.add).toHaveBeenCalledWith(
        BullWorkers.PROCESS_HABIT_IMPORT,
        expect.objectContaining({
          asyncTaskId: 'task-1',
          userId: 'user-123',
          mediaKey: 'user-123-1234567890-habit-import.png',
          mediaType: 'image',
          routineDurationMinutes: 30,
          routineType: 'morning',
        }),
        expect.objectContaining({
          jobId: 'task-1',
          removeOnComplete: true,
          removeOnFail: false,
          timeout: 180000,
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
        }),
      );

      expect(result).toEqual({ asyncTaskId: 'task-1' });
    });

    it('should enqueue habit import job for audio', async () => {
      const dto: HabitImportUploadedDto = {
        mediaKey: 'user-123-1234567890-habit-import.mp3',
        mediaType: 'audio',
      };

      asyncTaskServiceMock.createAsyncTask.mockResolvedValueOnce({ id: 'task-2', metadata: {} } as any);

      const result = await service.enqueueHabitImport(dto, 'user-456', 'mobile');

      expect(asyncTaskServiceMock.createAsyncTask).toHaveBeenCalledWith({
        metadata: expect.objectContaining({
          taskType: 'habit-import',
          userId: 'user-456',
          mediaType: 'audio',
          mediaKey: 'user-123-1234567890-habit-import.mp3',
          routineDurationMinutes: null,
          routineType: null,
          source: 'mobile',
        }),
      });

      expect(queueMock.add).toHaveBeenCalledWith(
        BullWorkers.PROCESS_HABIT_IMPORT,
        expect.objectContaining({
          asyncTaskId: 'task-2',
          userId: 'user-456',
          mediaKey: 'user-123-1234567890-habit-import.mp3',
          mediaType: 'audio',
        }),
        expect.any(Object),
      );

      expect(result).toEqual({ asyncTaskId: 'task-2' });
    });

    it('should use default source when not provided', async () => {
      const dto: HabitImportUploadedDto = {
        mediaKey: 'test-key.png',
        mediaType: 'image',
      };

      asyncTaskServiceMock.createAsyncTask.mockResolvedValueOnce({ id: 'task-3', metadata: {} } as any);

      await service.enqueueHabitImport(dto, 'user-789');

      expect(asyncTaskServiceMock.createAsyncTask).toHaveBeenCalledWith({
        metadata: expect.objectContaining({
          source: 'unknown',
        }),
      });
    });

    it('should throw error and capture to Sentry when queue add fails', async () => {
      const dto: HabitImportUploadedDto = {
        mediaKey: 'test-key.png',
        mediaType: 'image',
      };

      const error = new Error('Queue connection failed');
      asyncTaskServiceMock.createAsyncTask.mockResolvedValueOnce({ id: 'task-4', metadata: {} } as any);
      queueMock.add.mockRejectedValueOnce(error);

      await expect(service.enqueueHabitImport(dto, 'user-123', 'api')).rejects.toThrow('Queue connection failed');

      expect(SentryServiceMock.captureException).toHaveBeenCalledWith(error, {
        level: 'error',
        extra: {
          userId: 'user-123',
          asyncTaskId: 'task-4',
          queue: BullQueues.HABIT_IMPORT,
        },
      });
    });

    it('should generate consistent request hash for same inputs', async () => {
      const dto: HabitImportUploadedDto = {
        mediaKey: 'same-key.png',
        mediaType: 'image',
        routineDurationMinutes: 15,
        routineType: 'morning',
      };

      asyncTaskServiceMock.createAsyncTask.mockResolvedValue({ id: 'task-hash', metadata: {} } as any);

      await service.enqueueHabitImport(dto, 'user-hash', 'api');
      const firstCallHash = (queueMock.add.mock.calls[0][1] as any).requestHash;

      await service.enqueueHabitImport(dto, 'user-hash', 'api');
      const secondCallHash = (queueMock.add.mock.calls[1][1] as any).requestHash;

      expect(firstCallHash).toBe(secondCallHash);
    });

    it('should generate different request hash for different inputs', async () => {
      const dto1: HabitImportUploadedDto = {
        mediaKey: 'key-1.png',
        mediaType: 'image',
      };

      const dto2: HabitImportUploadedDto = {
        mediaKey: 'key-2.png',
        mediaType: 'image',
      };

      asyncTaskServiceMock.createAsyncTask.mockResolvedValue({ id: 'task-hash', metadata: {} } as any);

      await service.enqueueHabitImport(dto1, 'user-hash', 'api');
      const firstCallHash = (queueMock.add.mock.calls[0][1] as any).requestHash;

      await service.enqueueHabitImport(dto2, 'user-hash', 'api');
      const secondCallHash = (queueMock.add.mock.calls[1][1] as any).requestHash;

      expect(firstCallHash).not.toBe(secondCallHash);
    });
  });
});
