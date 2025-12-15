import { Test, TestingModule } from '@nestjs/testing';
import { SENTRY_TOKEN } from '@app/observability';
import { Job } from 'bull';
import { OpenAIService } from '@app/openai';
import { R2Service } from '@app/r2';
import axios from 'axios';
import { TodoImageConsumer } from './todo-image.consumer';
import { AsyncTaskService } from '../../async-task/services/async-task.service';
import { AsyncTaskStatus } from '../../async-task/domain/async-task-status.enum';
import { SentryServiceMock, OpenAIServiceMock, R2ServiceMock } from '../../../../test/mocks';
import { userDummy } from '../../../../test/dummies';
import { S3_BUCKET_TODO_IMAGES } from '../../../shared/utils/constants';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('TodoImageConsumer', () => {
  let consumer: TodoImageConsumer;
  let openAIService: OpenAIService;
  let r2Service: R2Service;
  let asyncTaskService: AsyncTaskService;

  const mockAsyncTaskService = {
    updateStatusWithMetadata: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TodoImageConsumer,
        {
          provide: OpenAIService,
          useValue: OpenAIServiceMock,
        },
        {
          provide: R2Service,
          useValue: R2ServiceMock,
        },
        {
          provide: AsyncTaskService,
          useValue: mockAsyncTaskService,
        },
        {
          provide: SENTRY_TOKEN,
          useValue: SentryServiceMock,
        },
      ],
    }).compile();

    consumer = module.get<TodoImageConsumer>(TodoImageConsumer);
    openAIService = module.get<OpenAIService>(OpenAIService);
    r2Service = module.get<R2Service>(R2Service);
    asyncTaskService = module.get<AsyncTaskService>(AsyncTaskService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(consumer).toBeDefined();
  });

  describe('processTodoImage', () => {
    it('positive: should successfully process image and extract todos', async () => {
      const imageKey = 'test-image-key.png';
      const asyncTaskId = 'async-task-123';
      const imageUrl = 'https://r2.example.com/image-url';
      const mockImageBuffer = Buffer.from('fake-image-data');
      const mockTasks = [
        { task_name: 'Buy groceries', estimated_duration_minutes: 30 },
        { task_name: 'Call mom', estimated_duration_minutes: 15 },
      ];

      const job = {
        data: {
          userId: userDummy.id,
          imageKey,
          asyncTaskId,
        },
      } as Job;

      R2ServiceMock.getPresignedUrl.mockResolvedValue(imageUrl);
      mockedAxios.get.mockResolvedValue({
        data: mockImageBuffer,
      });
      OpenAIServiceMock.extractTodosFromImage.mockResolvedValue(mockTasks);

      const result = await consumer.processTodoImage(job);

      expect(asyncTaskService.updateStatusWithMetadata).toHaveBeenCalledWith(
        asyncTaskId,
        AsyncTaskStatus.PROCESSING,
        {
          taskType: 'todo-image-processing',
          userId: userDummy.id,
          imageKey,
        },
        {
          processingStarted: expect.any(Date),
        },
      );

      expect(r2Service.getPresignedUrl).toHaveBeenCalledWith(S3_BUCKET_TODO_IMAGES, imageKey);
      expect(mockedAxios.get).toHaveBeenCalledWith(imageUrl, {
        responseType: 'arraybuffer',
      });
      expect(openAIService.extractTodosFromImage).toHaveBeenCalledWith(
        expect.stringContaining('data:image/png;base64,'),
        expect.any(String),
      );

      expect(asyncTaskService.updateStatusWithMetadata).toHaveBeenCalledWith(
        asyncTaskId,
        AsyncTaskStatus.COMPLETED,
        {
          taskType: 'todo-image-processing',
          userId: userDummy.id,
          imageKey,
        },
        {
          processingCompleted: expect.any(Date),
          todosExtracted: 2,
          aiResponse: mockTasks,
        },
      );

      expect(result).toEqual(mockTasks);
    });

    it('positive: should handle empty todos extraction', async () => {
      const imageKey = 'test-image-key.png';
      const asyncTaskId = 'async-task-123';
      const imageUrl = 'https://r2.example.com/image-url';
      const mockImageBuffer = Buffer.from('fake-image-data');
      const mockTasks = [];

      const job = {
        data: {
          userId: userDummy.id,
          imageKey,
          asyncTaskId,
        },
      } as Job;

      R2ServiceMock.getPresignedUrl.mockResolvedValue(imageUrl);
      mockedAxios.get.mockResolvedValue({
        data: mockImageBuffer,
      });
      OpenAIServiceMock.extractTodosFromImage.mockResolvedValue(mockTasks);

      const result = await consumer.processTodoImage(job);

      expect(asyncTaskService.updateStatusWithMetadata).toHaveBeenCalledWith(
        asyncTaskId,
        AsyncTaskStatus.COMPLETED,
        expect.any(Object),
        {
          processingCompleted: expect.any(Date),
          todosExtracted: 0,
          aiResponse: mockTasks,
        },
      );

      expect(result).toEqual(mockTasks);
    });

    it('negative: should handle null todos from AI and set status to FAILED', async () => {
      const imageKey = 'test-image-key.png';
      const asyncTaskId = 'async-task-123';
      const imageUrl = 'https://r2.example.com/image-url';
      const mockImageBuffer = Buffer.from('fake-image-data');

      const job = {
        data: {
          userId: userDummy.id,
          imageKey,
          asyncTaskId,
        },
      } as Job;

      R2ServiceMock.getPresignedUrl.mockResolvedValue(imageUrl);
      mockedAxios.get.mockResolvedValue({
        data: mockImageBuffer,
      });
      OpenAIServiceMock.extractTodosFromImage.mockResolvedValue(null);

      await expect(consumer.processTodoImage(job)).rejects.toThrow('No todos detected in image');

      expect(asyncTaskService.updateStatusWithMetadata).toHaveBeenCalledWith(
        asyncTaskId,
        AsyncTaskStatus.FAILED,
        {
          taskType: 'todo-image-processing',
          userId: userDummy.id,
          imageKey,
        },
        {
          processingFailed: expect.any(Date),
          imageKey,
        },
      );
    });

    it('negative: should handle R2 service errors and set status to FAILED', async () => {
      const imageKey = 'test-image-key.png';
      const asyncTaskId = 'async-task-123';
      const error = new Error('R2 service error');

      const job = {
        data: {
          userId: userDummy.id,
          imageKey,
          asyncTaskId,
        },
      } as Job;

      R2ServiceMock.getPresignedUrl.mockRejectedValue(error);

      await expect(consumer.processTodoImage(job)).rejects.toThrow(error);

      expect(asyncTaskService.updateStatusWithMetadata).toHaveBeenCalledWith(
        asyncTaskId,
        AsyncTaskStatus.FAILED,
        {
          taskType: 'todo-image-processing',
          userId: userDummy.id,
          imageKey,
        },
        {
          processingFailed: expect.any(Date),
          imageKey,
        },
      );

      expect(SentryServiceMock.instance().captureException).toHaveBeenCalledWith(error, { level: 'error' });
    });

    it('negative: should handle OpenAI service errors and set status to FAILED', async () => {
      const imageKey = 'test-image-key.png';
      const asyncTaskId = 'async-task-123';
      const imageUrl = 'https://r2.example.com/image-url';
      const mockImageBuffer = Buffer.from('fake-image-data');
      const error = new Error('OpenAI API error');

      const job = {
        data: {
          userId: userDummy.id,
          imageKey,
          asyncTaskId,
        },
      } as Job;

      R2ServiceMock.getPresignedUrl.mockResolvedValue(imageUrl);
      mockedAxios.get.mockResolvedValue({
        data: mockImageBuffer,
      });
      OpenAIServiceMock.extractTodosFromImage.mockRejectedValue(error);

      await expect(consumer.processTodoImage(job)).rejects.toThrow(error);

      expect(asyncTaskService.updateStatusWithMetadata).toHaveBeenCalledWith(
        asyncTaskId,
        AsyncTaskStatus.FAILED,
        {
          taskType: 'todo-image-processing',
          userId: userDummy.id,
          imageKey,
        },
        {
          processingFailed: expect.any(Date),
          imageKey,
        },
      );

      expect(SentryServiceMock.instance().captureException).toHaveBeenCalledWith(error, { level: 'error' });
    });

    it('positive: should log breadcrumbs to Sentry during processing', async () => {
      const imageKey = 'test-image-key.png';
      const asyncTaskId = 'async-task-123';
      const imageUrl = 'https://r2.example.com/image-url';
      const mockImageBuffer = Buffer.from('fake-image-data');
      const mockTasks = [{ task_name: 'Test task', estimated_duration_minutes: 10 }];

      const job = {
        data: {
          userId: userDummy.id,
          imageKey,
          asyncTaskId,
        },
      } as Job;

      R2ServiceMock.getPresignedUrl.mockResolvedValue(imageUrl);
      mockedAxios.get.mockResolvedValue({
        data: mockImageBuffer,
      });
      OpenAIServiceMock.extractTodosFromImage.mockResolvedValue(mockTasks);

      await consumer.processTodoImage(job);

      expect(SentryServiceMock.instance().addBreadcrumb).toHaveBeenCalledWith({
        category: 'Service',
        level: 'debug',
        message: 'Processing todo image from R2',
        data: {
          userId: userDummy.id,
          imageKey,
        },
      });
    });
  });
});
