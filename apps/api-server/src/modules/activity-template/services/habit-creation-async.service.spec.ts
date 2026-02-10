import { Test } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { Queue } from 'bull';
import { SENTRY_TOKEN } from '@app/observability';
import { HabitCreationAsyncService } from './habit-creation-async.service';
import { AsyncTaskService } from '../../async-task/services/async-task.service';
import { BullQueues, BullWorkers } from '../../../shared/utils/constants';
import { CreateHabitWithAiDto } from '../dto/create-habit-with-ai.dto';
import { SentryServiceMock } from '../../../../test/mocks';

describe('HabitCreationAsyncService', () => {
  let service: HabitCreationAsyncService;
  const asyncTaskServiceMock = {
    createAsyncTask: jest.fn(),
    findActiveTaskByRequestHash: jest.fn(),
  } as unknown as jest.Mocked<AsyncTaskService>;
  const queueMock = {
    add: jest.fn(),
    getJob: jest.fn(),
  } as unknown as jest.Mocked<Queue>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        HabitCreationAsyncService,
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

    service = moduleRef.get<HabitCreationAsyncService>(HabitCreationAsyncService);
    jest.clearAllMocks();
  });

  it('enqueues habit creation jobs with timeout', async () => {
    const dto: CreateHabitWithAiDto = {
      prompt: 'Create a mobility habit',
      routine_duration: 10,
      routine: 'morning',
      user_goals: ['mobility'],
    };
    asyncTaskServiceMock.findActiveTaskByRequestHash.mockResolvedValueOnce(null);
    asyncTaskServiceMock.createAsyncTask.mockResolvedValueOnce({ id: 'task-1', metadata: {} } as any);

    const result = await service.enqueueHabitCreation(dto, 'user-7', 'api');

    expect(asyncTaskServiceMock.createAsyncTask).toHaveBeenCalled();
    expect(queueMock.add).toHaveBeenCalledWith(
      BullWorkers.PROCESS_HABIT_CREATION,
      expect.objectContaining({
        asyncTaskId: 'task-1',
        userId: 'user-7',
        request: dto,
      }),
      expect.objectContaining({
        jobId: expect.stringMatching(/^habit-creation:/),
        removeOnComplete: true,
        removeOnFail: false,
        timeout: 120000,
      }),
    );
    expect(result).toEqual({ asyncTaskId: 'task-1' });
  });

  it('returns existing active task for duplicate habit creation requests', async () => {
    const dto: CreateHabitWithAiDto = {
      prompt: 'Create a mobility habit',
      routine_duration: 10,
      routine: 'morning',
      user_goals: ['mobility'],
    };

    asyncTaskServiceMock.findActiveTaskByRequestHash.mockResolvedValueOnce({ id: 'existing-task-22' } as any);

    const result = await service.enqueueHabitCreation(dto, 'user-7', 'api');

    expect(asyncTaskServiceMock.createAsyncTask).not.toHaveBeenCalled();
    expect(queueMock.add).not.toHaveBeenCalled();
    expect(result).toEqual({ asyncTaskId: 'existing-task-22' });
  });
});
