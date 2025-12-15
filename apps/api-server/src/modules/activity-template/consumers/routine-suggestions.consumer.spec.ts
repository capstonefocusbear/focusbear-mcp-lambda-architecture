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

describe('RoutineSuggestionsConsumer', () => {
  let consumer: RoutineSuggestionsConsumer;
  const activityLibraryServiceMock = {
    getActivitiesRelatedToUserGoals: jest.fn(),
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
  });

  const buildJob = (overrides: Partial<Job<any>>): Job<any> =>
    ({
      id: 'job-1',
      attemptsMade: 0,
      data: {
        asyncTaskId: 'task-123',
        userId: 'user-7',
        requestHash: 'hash-abc',
        request: {
          user_goals: ['goal one'],
          routine_duration: 20,
          routine: 'morning',
          groupByGoals: false,
        } satisfies GetRoutineSuggestionsDto,
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
      result: suggestions,
    });
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
  });
});
