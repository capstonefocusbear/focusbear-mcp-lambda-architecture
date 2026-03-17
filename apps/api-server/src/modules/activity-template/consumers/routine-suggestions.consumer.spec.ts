import { Test } from '@nestjs/testing';
import { Job } from 'bull';
import { PusherService } from '@app/pusher';
import { SENTRY_TOKEN } from '@app/observability';
import { RoutineSuggestionsConsumer } from './routine-suggestions.consumer';
import { ActivityLibraryService } from '../services/activity-library.service';
import { AsyncTaskService } from '../../async-task/services/async-task.service';
import { AsyncTaskStatus } from '../../async-task/domain/async-task-status.enum';
import { SentryServiceMock, PusherServiceMock } from '../../../../test/mocks';
import { GetRoutineSuggestionsDto } from '../dto/get-routine-suggestions.dto';

jest.mock('@app/observability', () => {
  const actual = jest.requireActual('@app/observability');
  return {
    ...actual,
    emitAiPipelineMetrics: jest.fn(),
  };
});

const { emitAiPipelineMetrics } = jest.requireMock('@app/observability') as {
  emitAiPipelineMetrics: jest.Mock;
};

describe('RoutineSuggestionsConsumer', () => {
  let consumer: RoutineSuggestionsConsumer;
  const activityLibraryServiceMock = {
    getActivitiesRelatedToUserGoals: jest.fn(),
    createHabitWithAi: jest.fn(),
  } as unknown as jest.Mocked<ActivityLibraryService>;
  const asyncTaskServiceMock = {
    updateStatusWithMetadata: jest.fn(),
  } as unknown as jest.Mocked<AsyncTaskService>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        RoutineSuggestionsConsumer,
        {
          provide: ActivityLibraryService,
          useValue: activityLibraryServiceMock,
        },
        {
          provide: AsyncTaskService,
          useValue: asyncTaskServiceMock,
        },
        {
          provide: PusherService,
          useValue: PusherServiceMock,
        },
        {
          provide: SENTRY_TOKEN,
          useValue: SentryServiceMock,
        },
      ],
    }).compile();

    consumer = moduleRef.get<RoutineSuggestionsConsumer>(RoutineSuggestionsConsumer);
  });

  afterEach(() => {
    jest.clearAllMocks();
    emitAiPipelineMetrics.mockReset();
  });

  const buildJob = (overrides: Partial<Job<any>>): Job<any> =>
    ({
      id: 'job-1',
      attemptsMade: 0,
      data: {
        asyncTaskId: 'task-123',
        userId: 'user-7',
        requestHash: 'hash-abc',
        enqueuedAt: '2025-03-13T10:00:00.000Z',
        request: {
          user_goals: [{ goal: 'goal one', isCustom: false }],
          routine_duration: 20,
          routine: 'morning',
          groupByGoals: false,
        } satisfies GetRoutineSuggestionsDto,
      },
      ...overrides,
    } as Job<any>);

  const buildHabitJob = (overrides: Partial<Job<any>>): Job<any> =>
    ({
      id: 'job-habit-1',
      attemptsMade: 0,
      data: {
        asyncTaskId: 'task-456',
        userId: 'user-7',
        requestHash: 'hash-habit',
        enqueuedAt: '2025-03-13T10:00:00.000Z',
        request: {
          user_goals: ['goal one', 'goal two'],
          routine_duration: 20,
          routine: 'morning',
          prompt: 'Build a habit',
        },
      },
      ...overrides,
    } as Job<any>);

  it('marks the task as processing, runs the pipeline, and emits completion events', async () => {
    const job = buildJob({});
    const suggestions = { templates: [{ id: 'activity-1' }], groupedByGoal: undefined };

    (activityLibraryServiceMock.getActivitiesRelatedToUserGoals as jest.Mock).mockResolvedValue(suggestions);

    await consumer.handleRoutineSuggestions(job);

    expect(asyncTaskServiceMock.updateStatusWithMetadata).toHaveBeenNthCalledWith(
      1,
      'task-123',
      AsyncTaskStatus.PROCESSING,
      expect.objectContaining({
        taskType: 'routine-suggestions',
        userId: 'user-7',
        goalCount: 1,
        routine: 'morning',
        durationMinutes: 20,
        requestHash: 'hash-abc',
        enqueuedAt: '2025-03-13T10:00:00.000Z',
      }),
      expect.objectContaining({
        processingStartedAt: expect.any(Date),
        attempt: 1,
      }),
    );

    expect(activityLibraryServiceMock.getActivitiesRelatedToUserGoals).toHaveBeenCalledWith(
      job.data.request,
      'user-7',
      {
        asyncTaskId: 'task-123',
        requestHash: 'hash-abc',
      },
    );

    expect(asyncTaskServiceMock.updateStatusWithMetadata).toHaveBeenNthCalledWith(
      2,
      'task-123',
      AsyncTaskStatus.COMPLETED,
      expect.objectContaining({
        taskType: 'routine-suggestions',
        userId: 'user-7',
        requestHash: 'hash-abc',
      }),
      expect.objectContaining({
        result: suggestions,
        completedAt: expect.any(Date),
      }),
    );

    expect(PusherServiceMock.trigger).toHaveBeenCalledWith('private-user-7', 'routine-suggestions.completed', {
      asyncTaskId: 'task-123',
      status: 'completed',
    });

    expect(emitAiPipelineMetrics).toHaveBeenCalledWith(
      expect.objectContaining({
        pipeline: 'routine-suggestions',
        operation: 'getActivitiesRelatedToUserGoals',
        success: true,
        endToEndDurationMs: expect.any(Number),
        queueWaitMs: expect.any(Number),
        emitDurationMetric: false,
        emitSuccessMetric: false,
      }),
    );
  });

  it('emits habit creation completion without the full result payload', async () => {
    const job = buildHabitJob({});
    (activityLibraryServiceMock.createHabitWithAi as jest.Mock).mockResolvedValue([{ id: 'habit-1' }]);

    await consumer.handleHabitCreation(job);

    expect(PusherServiceMock.trigger).toHaveBeenCalledWith('private-user-7', 'habit-creation.completed', {
      asyncTaskId: 'task-456',
      status: 'completed',
    });

    expect(emitAiPipelineMetrics).toHaveBeenCalledWith(
      expect.objectContaining({
        pipeline: 'habit-creation',
        operation: 'createHabitWithAi',
        success: true,
        endToEndDurationMs: expect.any(Number),
        queueWaitMs: expect.any(Number),
      }),
    );
  });

  it('captures errors, marks the task failed, and notifies clients', async () => {
    const job = buildJob({});
    const error = new Error('something went wrong');
    (activityLibraryServiceMock.getActivitiesRelatedToUserGoals as jest.Mock).mockRejectedValue(error);

    await consumer.handleRoutineSuggestions(job);

    expect(asyncTaskServiceMock.updateStatusWithMetadata).toHaveBeenNthCalledWith(
      1,
      'task-123',
      AsyncTaskStatus.PROCESSING,
      expect.any(Object),
      expect.any(Object),
    );

    expect(asyncTaskServiceMock.updateStatusWithMetadata).toHaveBeenLastCalledWith(
      'task-123',
      AsyncTaskStatus.FAILED,
      expect.objectContaining({
        taskType: 'routine-suggestions',
        userId: 'user-7',
        requestHash: 'hash-abc',
      }),
      expect.objectContaining({
        errorMessage: 'something went wrong',
        failedAt: expect.any(Date),
      }),
    );

    expect(PusherServiceMock.trigger).toHaveBeenCalledWith('private-user-7', 'routine-suggestions.completed', {
      asyncTaskId: 'task-123',
      status: 'failed',
      errorMessage: 'something went wrong',
    });

    expect(emitAiPipelineMetrics).toHaveBeenCalledWith(
      expect.objectContaining({
        pipeline: 'routine-suggestions',
        operation: 'getActivitiesRelatedToUserGoals',
        success: false,
        endToEndDurationMs: expect.any(Number),
        queueWaitMs: expect.any(Number),
      }),
    );
  });
});
