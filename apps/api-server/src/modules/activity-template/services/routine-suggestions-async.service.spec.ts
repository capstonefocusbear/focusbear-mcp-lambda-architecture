import { Test } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { Queue } from 'bull';
import { SENTRY_TOKEN } from '@ntegral/nestjs-sentry';
import { RoutineSuggestionsAsyncService } from './routine-suggestions-async.service';
import { AsyncTaskService } from '../../async-task/services/async-task.service';
import { AsyncTask } from '../../async-task/entities/async-task.entity';
import { BullQueues, BullWorkers } from '../../../shared/utils/constants';
import { GetRoutineSuggestionsDto } from '../dto/get-routine-suggestions.dto';
import { SentryServiceMock } from '../../../../test/mocks';

describe('RoutineSuggestionsAsyncService', () => {
  let service: RoutineSuggestionsAsyncService;
  const asyncTaskServiceMock = {
    createAsyncTask: jest.fn(),
  } as unknown as jest.Mocked<AsyncTaskService>;
  const queueMock = {
    add: jest.fn(),
  } as unknown as jest.Mocked<Queue>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        RoutineSuggestionsAsyncService,
        {
          provide: AsyncTaskService,
          useValue: asyncTaskServiceMock,
        },
        {
          provide: getQueueToken(BullQueues.ROUTINE_SUGGESTIONS),
          useValue: queueMock,
        },
        {
          provide: SENTRY_TOKEN,
          useValue: SentryServiceMock,
        },
      ],
    }).compile();

    service = moduleRef.get<RoutineSuggestionsAsyncService>(RoutineSuggestionsAsyncService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('creates an async task and enqueues a routine suggestion job', async () => {
    const dto: GetRoutineSuggestionsDto = {
      user_goals: ['be healthier', 'read more'],
      routine_duration: 30,
      routine: 'morning',
      groupByGoals: false,
    };

    const asyncTask = new AsyncTask({
      id: 'async-task-123',
      metadata: {},
    });

    (asyncTaskServiceMock.createAsyncTask as jest.Mock).mockResolvedValue(asyncTask);

    const result = await service.enqueueRoutineSuggestions(dto, 'user-42', 'app');

    expect(asyncTaskServiceMock.createAsyncTask).toHaveBeenCalledWith({
      metadata: expect.objectContaining({
        taskType: 'routine-suggestions',
        userId: 'user-42',
        goalCount: 2,
        routine: 'morning',
        durationMinutes: 30,
        source: 'app',
        requestHash: expect.any(String),
      }),
    });

    const createArgs = (asyncTaskServiceMock.createAsyncTask as jest.Mock).mock.calls[0]?.[0];
    expect(createArgs?.metadata).toBeDefined();
    const { metadata } = createArgs as { metadata: Record<string, any> };

    expect(queueMock.add).toHaveBeenCalledWith(
      BullWorkers.PROCESS_ROUTINE_SUGGESTIONS,
      {
        asyncTaskId: 'async-task-123',
        userId: 'user-42',
        request: dto,
        requestHash: metadata.requestHash,
      },
      expect.objectContaining({
        jobId: 'async-task-123',
        removeOnComplete: true,
        removeOnFail: false,
      }),
    );

    expect(result).toEqual({ asyncTaskId: 'async-task-123' });
  });
});
