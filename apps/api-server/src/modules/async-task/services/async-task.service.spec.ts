import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import { SENTRY_TOKEN } from '@ntegral/nestjs-sentry';
import { NotFoundException } from '@nestjs/common';
import { AsyncTaskService } from './async-task.service';
import { AsyncTaskRepository } from '../repositories/async-task.repository';
import { CreateAsyncTaskDto } from '../dto/create-async-task.dto';
import { UpdateAsyncTaskStatusDto } from '../dto/update-async-task-status.dto';
import { AsyncTask } from '../entities/async-task.entity';
import { AsyncTaskStatus } from '../domain/async-task-status.enum';

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
        },
      });
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
});
