import { Test, TestingModule } from '@nestjs/testing';
import { SENTRY_TOKEN } from '@ntegral/nestjs-sentry';
import { Job } from 'bull';
import { OpenAIService } from '@app/openai';
import { R2Service } from '@app/r2';
import axios from 'axios';
import { TodoAudioConsumer } from './todo-audio.consumer';
import { AsyncTaskService } from '../../async-task/services/async-task.service';
import { AsyncTaskStatus } from '../../async-task/domain/async-task-status.enum';
import { SentryServiceMock, OpenAIServiceMock, R2ServiceMock } from '../../../../test/mocks';
import { userDummy } from '../../../../test/dummies';
import { S3_BUCKET_TODO_AUDIOS } from '../../../shared/utils/constants';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

jest.mock('openai/uploads', () => ({
  toFile: jest.fn((buffer, fileName) => ({
    buffer,
    fileName,
  })),
}));

describe('TodoAudioConsumer', () => {
  let consumer: TodoAudioConsumer;
  let openAIService: OpenAIService;
  let r2Service: R2Service;
  let asyncTaskService: AsyncTaskService;

  const mockAsyncTaskService = {
    updateStatusWithMetadata: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TodoAudioConsumer,
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

    consumer = module.get<TodoAudioConsumer>(TodoAudioConsumer);
    openAIService = module.get<OpenAIService>(OpenAIService);
    r2Service = module.get<R2Service>(R2Service);
    asyncTaskService = module.get<AsyncTaskService>(AsyncTaskService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(consumer).toBeDefined();
  });

  describe('processTodoAudio', () => {
    it('positive: should successfully transcribe audio and create todos', async () => {
      const audioKey = 'test-audio-key.mp3';
      const asyncTaskId = 'async-task-123';
      const audioUrl = 'https://r2.example.com/audio-url';
      const mockAudioBuffer = Buffer.from('fake-audio-data');
      const mockTranscript = 'Buy groceries, call mom, finish report';
      const mockTasks = [
        { task_name: 'Buy groceries', estimated_duration_minutes: 30 },
        { task_name: 'Call mom', estimated_duration_minutes: 15 },
        { task_name: 'Finish report', estimated_duration_minutes: 60 },
      ];

      const job = {
        data: {
          userId: userDummy.id,
          audioKey,
          asyncTaskId,
        },
      } as Job;

      R2ServiceMock.getPresignedUrl.mockResolvedValue(audioUrl);
      mockedAxios.get.mockResolvedValue({
        data: mockAudioBuffer,
      });
      OpenAIServiceMock.transcribeAudioToText.mockResolvedValue(mockTranscript);
      OpenAIServiceMock.createDraftTodosFromTranscript.mockResolvedValue(mockTasks);

      const result = await consumer.processTodoAudio(job);

      expect(asyncTaskService.updateStatusWithMetadata).toHaveBeenCalledWith(
        asyncTaskId,
        AsyncTaskStatus.PROCESSING,
        {
          taskType: 'todo-audio-processing',
          userId: userDummy.id,
          audioKey,
        },
        {
          processingStarted: expect.any(Date),
        },
      );

      expect(r2Service.getPresignedUrl).toHaveBeenCalledWith(S3_BUCKET_TODO_AUDIOS, audioKey);
      expect(mockedAxios.get).toHaveBeenCalledWith(audioUrl, {
        responseType: 'arraybuffer',
        timeout: 120000,
      });
      expect(openAIService.transcribeAudioToText).toHaveBeenCalledWith(expect.any(Object));
      expect(openAIService.createDraftTodosFromTranscript).toHaveBeenCalledWith(mockTranscript);

      expect(asyncTaskService.updateStatusWithMetadata).toHaveBeenCalledWith(
        asyncTaskId,
        AsyncTaskStatus.COMPLETED,
        {
          taskType: 'todo-audio-processing',
          userId: userDummy.id,
          audioKey,
        },
        {
          processingCompleted: expect.any(Date),
          aiResponse: mockTasks,
        },
      );

      expect(result).toEqual(mockTasks);
    });

    it('positive: should handle .mp3 audio file extension', async () => {
      const audioKey = 'test-audio-key.mp3';
      const asyncTaskId = 'async-task-123';
      const audioUrl = 'https://r2.example.com/audio-url';
      const mockAudioBuffer = Buffer.from('fake-audio-data');
      const mockTranscript = 'Test transcript';
      const mockTasks = [{ task_name: 'Test task', estimated_duration_minutes: 10 }];

      const job = {
        data: {
          userId: userDummy.id,
          audioKey,
          asyncTaskId,
        },
      } as Job;

      R2ServiceMock.getPresignedUrl.mockResolvedValue(audioUrl);
      mockedAxios.get.mockResolvedValue({
        data: mockAudioBuffer,
      });
      OpenAIServiceMock.transcribeAudioToText.mockResolvedValue(mockTranscript);
      OpenAIServiceMock.createDraftTodosFromTranscript.mockResolvedValue(mockTasks);

      await consumer.processTodoAudio(job);

      expect(openAIService.transcribeAudioToText).toHaveBeenCalled();
    });

    it('positive: should handle .wav audio file extension', async () => {
      const audioKey = 'test-audio-key.wav';
      const asyncTaskId = 'async-task-123';
      const audioUrl = 'https://r2.example.com/audio-url';
      const mockAudioBuffer = Buffer.from('fake-audio-data');
      const mockTranscript = 'Test transcript';
      const mockTasks = [{ task_name: 'Test task', estimated_duration_minutes: 10 }];

      const job = {
        data: {
          userId: userDummy.id,
          audioKey,
          asyncTaskId,
        },
      } as Job;

      R2ServiceMock.getPresignedUrl.mockResolvedValue(audioUrl);
      mockedAxios.get.mockResolvedValue({
        data: mockAudioBuffer,
      });
      OpenAIServiceMock.transcribeAudioToText.mockResolvedValue(mockTranscript);
      OpenAIServiceMock.createDraftTodosFromTranscript.mockResolvedValue(mockTasks);

      await consumer.processTodoAudio(job);

      expect(openAIService.transcribeAudioToText).toHaveBeenCalled();
    });

    it('positive: should use default .mp3 extension for invalid file extensions', async () => {
      const audioKey = 'test-audio-key.invalidext';
      const asyncTaskId = 'async-task-123';
      const audioUrl = 'https://r2.example.com/audio-url';
      const mockAudioBuffer = Buffer.from('fake-audio-data');
      const mockTranscript = 'Test transcript';
      const mockTasks = [{ task_name: 'Test task', estimated_duration_minutes: 10 }];

      const job = {
        data: {
          userId: userDummy.id,
          audioKey,
          asyncTaskId,
        },
      } as Job;

      R2ServiceMock.getPresignedUrl.mockResolvedValue(audioUrl);
      mockedAxios.get.mockResolvedValue({
        data: mockAudioBuffer,
      });
      OpenAIServiceMock.transcribeAudioToText.mockResolvedValue(mockTranscript);
      OpenAIServiceMock.createDraftTodosFromTranscript.mockResolvedValue(mockTasks);

      await consumer.processTodoAudio(job);

      expect(openAIService.transcribeAudioToText).toHaveBeenCalled();
    });

    it('negative: should handle R2 service errors and set status to FAILED', async () => {
      const audioKey = 'test-audio-key.mp3';
      const asyncTaskId = 'async-task-123';
      const error = new Error('R2 service error');

      const job = {
        data: {
          userId: userDummy.id,
          audioKey,
          asyncTaskId,
        },
      } as Job;

      R2ServiceMock.getPresignedUrl.mockRejectedValue(error);

      await expect(consumer.processTodoAudio(job)).rejects.toThrow(error);

      expect(asyncTaskService.updateStatusWithMetadata).toHaveBeenCalledWith(
        asyncTaskId,
        AsyncTaskStatus.FAILED,
        {
          taskType: 'todo-audio-processing',
          userId: userDummy.id,
          audioKey,
        },
        {
          processingFailed: expect.any(Date),
          audioKey,
        },
      );

      expect(SentryServiceMock.instance().captureException).toHaveBeenCalledWith(error, { level: 'error' });
    });

    it('negative: should handle transcription errors and set status to FAILED', async () => {
      const audioKey = 'test-audio-key.mp3';
      const asyncTaskId = 'async-task-123';
      const audioUrl = 'https://r2.example.com/audio-url';
      const mockAudioBuffer = Buffer.from('fake-audio-data');
      const error = new Error('Transcription failed');

      const job = {
        data: {
          userId: userDummy.id,
          audioKey,
          asyncTaskId,
        },
      } as Job;

      R2ServiceMock.getPresignedUrl.mockResolvedValue(audioUrl);
      mockedAxios.get.mockResolvedValue({
        data: mockAudioBuffer,
      });
      OpenAIServiceMock.transcribeAudioToText.mockRejectedValue(error);

      await expect(consumer.processTodoAudio(job)).rejects.toThrow(error);

      expect(asyncTaskService.updateStatusWithMetadata).toHaveBeenCalledWith(
        asyncTaskId,
        AsyncTaskStatus.FAILED,
        {
          taskType: 'todo-audio-processing',
          userId: userDummy.id,
          audioKey,
        },
        {
          processingFailed: expect.any(Date),
          audioKey,
        },
      );

      expect(SentryServiceMock.instance().captureException).toHaveBeenCalledWith(error, { level: 'error' });
    });

    it('negative: should handle todo creation errors and set status to FAILED', async () => {
      const audioKey = 'test-audio-key.mp3';
      const asyncTaskId = 'async-task-123';
      const audioUrl = 'https://r2.example.com/audio-url';
      const mockAudioBuffer = Buffer.from('fake-audio-data');
      const mockTranscript = 'Buy groceries, call mom';
      const error = new Error('Failed to create todos from transcript');

      const job = {
        data: {
          userId: userDummy.id,
          audioKey,
          asyncTaskId,
        },
      } as Job;

      R2ServiceMock.getPresignedUrl.mockResolvedValue(audioUrl);
      mockedAxios.get.mockResolvedValue({
        data: mockAudioBuffer,
      });
      OpenAIServiceMock.transcribeAudioToText.mockResolvedValue(mockTranscript);
      OpenAIServiceMock.createDraftTodosFromTranscript.mockRejectedValue(error);

      await expect(consumer.processTodoAudio(job)).rejects.toThrow(error);

      expect(asyncTaskService.updateStatusWithMetadata).toHaveBeenCalledWith(
        asyncTaskId,
        AsyncTaskStatus.FAILED,
        {
          taskType: 'todo-audio-processing',
          userId: userDummy.id,
          audioKey,
        },
        {
          processingFailed: expect.any(Date),
          audioKey,
        },
      );

      expect(SentryServiceMock.instance().captureException).toHaveBeenCalledWith(error, { level: 'error' });
    });

    it('positive: should handle empty transcript', async () => {
      const audioKey = 'test-audio-key.mp3';
      const asyncTaskId = 'async-task-123';
      const audioUrl = 'https://r2.example.com/audio-url';
      const mockAudioBuffer = Buffer.from('fake-audio-data');
      const mockTranscript = '';
      const mockTasks = [];

      const job = {
        data: {
          userId: userDummy.id,
          audioKey,
          asyncTaskId,
        },
      } as Job;

      R2ServiceMock.getPresignedUrl.mockResolvedValue(audioUrl);
      mockedAxios.get.mockResolvedValue({
        data: mockAudioBuffer,
      });
      OpenAIServiceMock.transcribeAudioToText.mockResolvedValue(mockTranscript);
      OpenAIServiceMock.createDraftTodosFromTranscript.mockResolvedValue(mockTasks);

      const result = await consumer.processTodoAudio(job);

      expect(result).toEqual(mockTasks);
      expect(asyncTaskService.updateStatusWithMetadata).toHaveBeenCalledWith(
        asyncTaskId,
        AsyncTaskStatus.COMPLETED,
        expect.any(Object),
        {
          processingCompleted: expect.any(Date),
          aiResponse: mockTasks,
        },
      );
    });
  });
});
