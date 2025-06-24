import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import { SENTRY_TOKEN } from '@ntegral/nestjs-sentry';
import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AsyncTaskService } from './async-task.service';
import { AsyncTaskRepository } from '../repositories/async-task.repository';
import { CreateAsyncTaskDto } from '../dto/create-async-task.dto';
import { UpdateAsyncTaskStatusDto } from '../dto/update-async-task-status.dto';
import { AsyncTask } from '../entities/async-task.entity';
import { AsyncTaskStatus } from '../domain/async-task-status.enum';
import * as dayjs from 'dayjs';

// Mock implementations
const mockAddBreadcrumb = jest.fn();
const mockCaptureException = jest.fn();

const SentryServiceMock = {
  instance: jest.fn(() => ({
    addBreadcrumb: mockAddBreadcrumb,
    captureException: mockCaptureException,
  })),
};

const AsyncTaskRepositoryMock = {
  create: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
  findByStatus: jest.fn(),
  find: jest.fn(),
};

const ConfigServiceMock = {
  get: jest.fn().mockImplementation((key: string) => {
    if (key === 'asyncTask') {
      return {
        defaultTimeoutSeconds: 300,
        maxTimeoutSeconds: 3600,
        expirationCheckIntervalSeconds: 60,
        taskTypeTimeouts: {
          'usage-image-processing': 600,
          'data-export': 1800,
        },
      };
    }
    return null;
  }),
};

describe('AsyncTaskService', () => {
  let asyncTaskService: AsyncTaskService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        AsyncTaskService,
        AsyncTaskRepository,
        {
          provide: SENTRY_TOKEN,
          useValue: SentryServiceMock,
        },
        {
          provide: ConfigService,
          useValue: ConfigServiceMock,
        },
      ],
    })
      .overrideProvider(AsyncTaskRepository)
      .useValue(AsyncTaskRepositoryMock)
      .compile();

    asyncTaskService = moduleRef.get<AsyncTaskService>(AsyncTaskService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockAddBreadcrumb.mockClear();
    mockCaptureException.mockClear();
  });

  describe('createAsyncTask', () => {
    it('should create a new async task with pending status', async () => {
      const createDto: CreateAsyncTaskDto = {
        metadata: {
          taskType: 'usage-image-processing',
          userId: 'user-123',
          imageKey: 'image-key-123',
        },
      };

      const expectedTask = new AsyncTask({
        id: randomUUID(),
        status: AsyncTaskStatus.PENDING,
        metadata: createDto.metadata,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      AsyncTaskRepositoryMock.create.mockResolvedValue(expectedTask);

      const result = await asyncTaskService.createAsyncTask(createDto);

      expect(AsyncTaskRepositoryMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: AsyncTaskStatus.PENDING,
          metadata: createDto.metadata,
        }),
      );
      expect(result).toEqual(expectedTask);
      expect(mockAddBreadcrumb).toHaveBeenCalledWith({
        category: 'Service',
        level: 'debug',
        message: 'Creating new async task',
        data: {
          metadata: createDto.metadata,
          timeoutSeconds: undefined,
        },
      });
    });

    it('should create async task with custom timeout', async () => {
      const createDto: CreateAsyncTaskDto = {
        metadata: { taskType: 'custom-task' },
        timeoutSeconds: 1200,
      };

      const expectedTask = new AsyncTask({
        id: randomUUID(),
        status: AsyncTaskStatus.PENDING,
        metadata: createDto.metadata,
        expires_at: dayjs().add(1200, 'seconds').toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      AsyncTaskRepositoryMock.create.mockResolvedValue(expectedTask);

      const result = await asyncTaskService.createAsyncTask(createDto);

      expect(AsyncTaskRepositoryMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: AsyncTaskStatus.PENDING,
          metadata: createDto.metadata,
          expires_at: expect.any(String),
        }),
      );
      expect(result).toEqual(expectedTask);
    });

    it('should use task-specific timeout from config', async () => {
      const createDto: CreateAsyncTaskDto = {
        metadata: { taskType: 'usage-image-processing' },
      };

      const expectedTask = new AsyncTask({
        id: randomUUID(),
        status: AsyncTaskStatus.PENDING,
        metadata: createDto.metadata,
        expires_at: dayjs().add(600, 'seconds').toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      AsyncTaskRepositoryMock.create.mockResolvedValue(expectedTask);

      await asyncTaskService.createAsyncTask(createDto);

      expect(AsyncTaskRepositoryMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          expires_at: expect.any(String),
        }),
      );
    });

    it('should create async task with undefined metadata when not provided', async () => {
      const createDto: CreateAsyncTaskDto = {};

      const expectedTask = new AsyncTask({
        id: randomUUID(),
        status: AsyncTaskStatus.PENDING,
        metadata: undefined,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      AsyncTaskRepositoryMock.create.mockResolvedValue(expectedTask);

      const result = await asyncTaskService.createAsyncTask(createDto);

      expect(AsyncTaskRepositoryMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: AsyncTaskStatus.PENDING,
          metadata: undefined,
        }),
      );
      expect(result).toEqual(expectedTask);
    });

    it('should handle repository errors and capture exception', async () => {
      const createDto: CreateAsyncTaskDto = {
        metadata: { taskType: 'test' },
      };

      const error = new Error('Database connection failed');
      AsyncTaskRepositoryMock.create.mockImplementation(() => {
        throw error;
      });

      await expect(asyncTaskService.createAsyncTask(createDto)).rejects.toThrow(
        error,
      );
      expect(mockCaptureException).toHaveBeenCalledWith(error, {
        level: 'error',
      });
    });
  });

  describe('findTaskById', () => {
    it('should return task when found', async () => {
      const taskId = randomUUID();
      const expectedTask = new AsyncTask({
        id: taskId,
        status: AsyncTaskStatus.PENDING,
        metadata: { taskType: 'test' },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      AsyncTaskRepositoryMock.findById.mockResolvedValue(expectedTask);

      const result = await asyncTaskService.findTaskById(taskId);

      expect(AsyncTaskRepositoryMock.findById).toHaveBeenCalledWith(taskId);
      expect(result).toEqual(expectedTask);
    });

    it('should throw NotFoundException when task not found', async () => {
      const taskId = randomUUID();
      AsyncTaskRepositoryMock.findById.mockResolvedValue(null);

      await expect(asyncTaskService.findTaskById(taskId)).rejects.toThrow(
        new NotFoundException(`Async task with ID: ${taskId} not found`),
      );
      expect(mockCaptureException).toHaveBeenCalled();
    });

    it('should handle repository errors and capture exception', async () => {
      const taskId = randomUUID();
      const error = new Error('Database connection failed');
      AsyncTaskRepositoryMock.findById.mockRejectedValue(error);

      await expect(asyncTaskService.findTaskById(taskId)).rejects.toThrow(
        error,
      );
      expect(mockCaptureException).toHaveBeenCalledWith(error, {
        level: 'error',
      });
    });
  });

  describe('updateTaskStatus', () => {
    it('should update task status and metadata', async () => {
      const taskId = randomUUID();
      const updateDto: UpdateAsyncTaskStatusDto = {
        status: AsyncTaskStatus.COMPLETED,
        metadata: { result: 'Task completed successfully', progress: 100 },
      };

      const existingTask = new AsyncTask({
        id: taskId,
        status: AsyncTaskStatus.PROCESSING,
        metadata: { taskType: 'test', progress: 50 },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const updatedTask = new AsyncTask({
        ...existingTask,
        status: updateDto.status,
        metadata: updateDto.metadata,
        updated_at: new Date().toISOString(),
      });

      AsyncTaskRepositoryMock.findById.mockResolvedValue(existingTask);
      AsyncTaskRepositoryMock.update.mockResolvedValue(updatedTask);

      const result = await asyncTaskService.updateTaskStatus(taskId, updateDto);

      expect(AsyncTaskRepositoryMock.findById).toHaveBeenCalledWith(taskId);
      expect(AsyncTaskRepositoryMock.update).toHaveBeenCalledWith(taskId, {
        status: updateDto.status,
        metadata: updateDto.metadata,
        expires_at: null,
      });
      expect(result).toEqual(updatedTask);
      expect(mockAddBreadcrumb).toHaveBeenCalledWith({
        category: 'Service',
        level: 'debug',
        message: 'Updating async task status',
        data: {
          taskId,
          newStatus: updateDto.status,
        },
      });
    });

    it('should preserve existing metadata when update metadata is not provided', async () => {
      const taskId = randomUUID();
      const updateDto: UpdateAsyncTaskStatusDto = {
        status: AsyncTaskStatus.COMPLETED,
      };

      const existingTask = new AsyncTask({
        id: taskId,
        status: AsyncTaskStatus.PROCESSING,
        metadata: { taskType: 'test', progress: 50 },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const updatedTask = new AsyncTask({
        ...existingTask,
        status: updateDto.status,
        updated_at: new Date().toISOString(),
      });

      AsyncTaskRepositoryMock.findById.mockResolvedValue(existingTask);
      AsyncTaskRepositoryMock.update.mockResolvedValue(updatedTask);

      const result = await asyncTaskService.updateTaskStatus(taskId, updateDto);

      expect(AsyncTaskRepositoryMock.update).toHaveBeenCalledWith(taskId, {
        status: updateDto.status,
        metadata: existingTask.metadata,
        expires_at: null,
      });
    });

    it('should update expires_at when task moves from pending to processing', async () => {
      const taskId = randomUUID();
      const updateDto: UpdateAsyncTaskStatusDto = {
        status: AsyncTaskStatus.PROCESSING,
      };

      const existingTask = new AsyncTask({
        id: taskId,
        status: AsyncTaskStatus.PENDING,
        metadata: { taskType: 'test' },
        expires_at: dayjs().add(300, 'seconds').toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const updatedTask = new AsyncTask({
        ...existingTask,
        status: updateDto.status,
        expires_at: dayjs().add(300, 'seconds').toISOString(),
        updated_at: new Date().toISOString(),
      });

      AsyncTaskRepositoryMock.findById.mockResolvedValue(existingTask);
      AsyncTaskRepositoryMock.update.mockResolvedValue(updatedTask);

      const result = await asyncTaskService.updateTaskStatus(taskId, updateDto);

      expect(AsyncTaskRepositoryMock.update).toHaveBeenCalledWith(taskId, {
        status: updateDto.status,
        metadata: existingTask.metadata,
        expires_at: expect.any(String),
      });
      expect(result).toEqual(updatedTask);
    });

    it('should throw NotFoundException when task not found during update', async () => {
      const taskId = randomUUID();
      const updateDto: UpdateAsyncTaskStatusDto = {
        status: AsyncTaskStatus.COMPLETED,
      };

      AsyncTaskRepositoryMock.findById.mockResolvedValue(null);

      await expect(
        asyncTaskService.updateTaskStatus(taskId, updateDto),
      ).rejects.toThrow(
        new NotFoundException(`Async task with ID: ${taskId} not found`),
      );
    });

    it('should handle repository errors and capture exception', async () => {
      const taskId = randomUUID();
      const updateDto: UpdateAsyncTaskStatusDto = {
        status: AsyncTaskStatus.FAILED,
      };

      const error = new Error('Database connection failed');
      AsyncTaskRepositoryMock.findById.mockRejectedValue(error);

      await expect(
        asyncTaskService.updateTaskStatus(taskId, updateDto),
      ).rejects.toThrow(error);
      expect(mockCaptureException).toHaveBeenCalledWith(error, {
        level: 'error',
      });
    });
  });

  describe('findTasksByStatus', () => {
    it('should return tasks with specified status', async () => {
      const status = AsyncTaskStatus.PENDING;
      const expectedTasks = [
        new AsyncTask({
          id: randomUUID(),
          status,
          metadata: { taskType: 'test1' },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
        new AsyncTask({
          id: randomUUID(),
          status,
          metadata: { taskType: 'test2' },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
      ];

      AsyncTaskRepositoryMock.findByStatus.mockResolvedValue(expectedTasks);

      const result = await asyncTaskService.findTasksByStatus(status);

      expect(AsyncTaskRepositoryMock.findByStatus).toHaveBeenCalledWith(status);
      expect(result).toEqual(expectedTasks);
    });

    it('should return empty array when no tasks found with specified status', async () => {
      const status = AsyncTaskStatus.COMPLETED;
      AsyncTaskRepositoryMock.findByStatus.mockResolvedValue([]);

      const result = await asyncTaskService.findTasksByStatus(status);

      expect(AsyncTaskRepositoryMock.findByStatus).toHaveBeenCalledWith(status);
      expect(result).toEqual([]);
    });

    it('should handle repository errors and capture exception', async () => {
      const status = AsyncTaskStatus.FAILED;
      const error = new Error('Database connection failed');
      AsyncTaskRepositoryMock.findByStatus.mockImplementation(() => {
        throw error;
      });

      await expect(asyncTaskService.findTasksByStatus(status)).rejects.toThrow(
        error,
      );
      expect(mockCaptureException).toHaveBeenCalledWith(error, {
        level: 'error',
      });
    });

    it('should work with all status enum values', async () => {
      const statusValues = Object.values(AsyncTaskStatus);
      const promises = statusValues.map(async (status) => {
        AsyncTaskRepositoryMock.findByStatus.mockResolvedValue([]);

        const result = await asyncTaskService.findTasksByStatus(status);

        expect(AsyncTaskRepositoryMock.findByStatus).toHaveBeenCalledWith(
          status,
        );
        expect(result).toEqual([]);
      });

      await Promise.all(promises);
    });
  });

  describe('findExpiredTasks', () => {
    it('should return expired pending and processing tasks', async () => {
      const currentTime = dayjs();
      const expiredTasks = [
        new AsyncTask({
          id: randomUUID(),
          status: AsyncTaskStatus.PENDING,
          expires_at: currentTime.subtract(10, 'minutes').toISOString(),
          created_at: currentTime.subtract(20, 'minutes').toISOString(),
          updated_at: currentTime.subtract(20, 'minutes').toISOString(),
        }),
        new AsyncTask({
          id: randomUUID(),
          status: AsyncTaskStatus.PROCESSING,
          expires_at: currentTime.subtract(5, 'minutes').toISOString(),
          created_at: currentTime.subtract(15, 'minutes').toISOString(),
          updated_at: currentTime.subtract(10, 'minutes').toISOString(),
        }),
      ];

      AsyncTaskRepositoryMock.find.mockResolvedValue(expiredTasks);

      const result = await asyncTaskService.findExpiredTasks();

      expect(AsyncTaskRepositoryMock.find).toHaveBeenCalledWith({
        where: [
          {
            status: AsyncTaskStatus.PENDING,
            expires_at: expect.any(Object),
          },
          {
            status: AsyncTaskStatus.PROCESSING,
            expires_at: expect.any(Object),
          },
        ],
      });
      expect(result).toEqual(expiredTasks);
    });

    it('should handle repository errors', async () => {
      const error = new Error('Database error');
      AsyncTaskRepositoryMock.find.mockRejectedValue(error);

      await expect(asyncTaskService.findExpiredTasks()).rejects.toThrow(error);
      expect(mockCaptureException).toHaveBeenCalledWith(error, {
        level: 'error',
      });
    });
  });

  describe('markExpiredTasksAsFailed', () => {
    it('should mark expired tasks as failed and return count', async () => {
      const expiredTasks = [
        new AsyncTask({
          id: randomUUID(),
          status: AsyncTaskStatus.PENDING,
          metadata: { taskType: 'test1' },
          expires_at: dayjs().subtract(5, 'minutes').toISOString(),
        }),
        new AsyncTask({
          id: randomUUID(),
          status: AsyncTaskStatus.PROCESSING,
          metadata: { taskType: 'test2' },
          expires_at: dayjs().subtract(10, 'minutes').toISOString(),
        }),
      ];

      AsyncTaskRepositoryMock.find.mockResolvedValue(expiredTasks);
      AsyncTaskRepositoryMock.findById.mockImplementation((id) =>
        expiredTasks.find((task) => task.id === id),
      );
      AsyncTaskRepositoryMock.update.mockImplementation((id) => {
        const task = expiredTasks.find((t) => t.id === id);
        return Promise.resolve({
          ...task,
          status: AsyncTaskStatus.FAILED,
          updated_at: new Date().toISOString(),
        });
      });

      const result = await asyncTaskService.markExpiredTasksAsFailed();

      expect(result).toBe(2);
      expect(AsyncTaskRepositoryMock.update).toHaveBeenCalledTimes(2);
      expect(mockAddBreadcrumb).toHaveBeenCalledWith({
        category: 'Service',
        level: 'info',
        message: 'Marking expired tasks as failed',
        data: {
          count: 2,
          taskIds: expiredTasks.map((t) => t.id),
        },
      });
    });

    it('should return 0 when no expired tasks found', async () => {
      AsyncTaskRepositoryMock.find.mockResolvedValue([]);

      const result = await asyncTaskService.markExpiredTasksAsFailed();

      expect(result).toBe(0);
      expect(AsyncTaskRepositoryMock.update).not.toHaveBeenCalled();
    });

    it('should handle errors during marking tasks as failed', async () => {
      const error = new Error('Update failed');
      AsyncTaskRepositoryMock.find.mockRejectedValue(error);

      await expect(asyncTaskService.markExpiredTasksAsFailed()).rejects.toThrow(
        error,
      );
      expect(mockCaptureException).toHaveBeenCalledWith(error, {
        level: 'error',
      });
    });
  });
});
