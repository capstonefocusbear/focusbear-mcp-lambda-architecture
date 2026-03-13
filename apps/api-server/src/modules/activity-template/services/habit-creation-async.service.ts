import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { createHash } from 'crypto';
import { InjectSentry, SentryService } from '@app/observability';
import { AsyncTaskService } from '../../async-task/services/async-task.service';
import { AsyncTaskStatus } from '../../async-task/domain/async-task-status.enum';
import { BullQueues, BullWorkers } from '../../../shared/utils/constants';
import { CreateHabitWithAiDto } from '../dto/create-habit-with-ai.dto';
import { getInFlightAsyncTaskIdByJobId, reuseInFlightOrCleanupTerminalJob } from './async-task-dedup.util';

export interface HabitCreationJobData {
  asyncTaskId: string;
  userId: string;
  request: CreateHabitWithAiDto;
  requestHash: string;
  enqueuedAt: string;
}

@Injectable()
export class HabitCreationAsyncService {
  private static readonly TASK_TYPE = 'habit-creation';

  constructor(
    private readonly asyncTaskService: AsyncTaskService,
    @InjectQueue(BullQueues.ROUTINE_SUGGESTIONS) private readonly routineSuggestionsQueue: Queue,
    @InjectSentry() private readonly sentry: SentryService,
  ) {}

  async enqueueHabitCreation(
    dto: CreateHabitWithAiDto,
    userId: string,
    source?: string,
  ): Promise<{ asyncTaskId: string }> {
    const requestHash = this.computeRequestHash(dto, userId);
    const jobId = `${HabitCreationAsyncService.TASK_TYPE}:${requestHash}`;
    const enqueuedAt = new Date().toISOString();
    const existingTask = await this.asyncTaskService.findActiveTaskByRequestHash(
      HabitCreationAsyncService.TASK_TYPE,
      userId,
      requestHash,
    );
    if (existingTask?.id) {
      return { asyncTaskId: existingTask.id };
    }
    const existingQueueTaskId = await reuseInFlightOrCleanupTerminalJob({
      queue: this.routineSuggestionsQueue,
      queueName: BullQueues.ROUTINE_SUGGESTIONS,
      sentry: this.sentry,
      jobId,
    });
    if (existingQueueTaskId) {
      return { asyncTaskId: existingQueueTaskId };
    }

    const metadata = {
      taskType: HabitCreationAsyncService.TASK_TYPE,
      userId,
      goalCount: dto.user_goals?.length ?? 0,
      routine: dto.routine ?? null,
      durationMinutes: dto.routine_duration ?? null,
      source: source ?? 'unknown',
      requestHash,
      enqueuedAt,
    };

    const asyncTask = await this.asyncTaskService.createAsyncTask({ metadata });

    try {
      const queuedJob = await this.routineSuggestionsQueue.add(
        BullWorkers.PROCESS_HABIT_CREATION,
        {
          asyncTaskId: asyncTask.id,
          userId,
          request: dto,
          requestHash,
          enqueuedAt,
        } satisfies HabitCreationJobData,
        {
          jobId,
          removeOnComplete: true,
          removeOnFail: false,
          timeout: 120000,
        },
      );

      const queuedJobId =
        typeof queuedJob?.id === 'string' || typeof queuedJob?.id === 'number' ? String(queuedJob.id) : jobId;
      const inFlightAsyncTaskId = await getInFlightAsyncTaskIdByJobId(this.routineSuggestionsQueue, queuedJobId);
      if (inFlightAsyncTaskId && inFlightAsyncTaskId !== asyncTask.id) {
        await this.asyncTaskService.updateStatusWithMetadata(asyncTask.id, AsyncTaskStatus.FAILED, metadata, {
          processingFailed: new Date(),
          duplicateOfAsyncTaskId: inFlightAsyncTaskId,
          error: 'Duplicate queue job detected after enqueue',
        });
        return { asyncTaskId: inFlightAsyncTaskId };
      }
    } catch (error) {
      const duplicateQueueTaskId = await getInFlightAsyncTaskIdByJobId(this.routineSuggestionsQueue, jobId);
      if (duplicateQueueTaskId) {
        await this.asyncTaskService.updateStatusWithMetadata(asyncTask.id, AsyncTaskStatus.FAILED, metadata, {
          processingFailed: new Date(),
          duplicateOfAsyncTaskId: duplicateQueueTaskId,
          error: 'Duplicate queue job detected while enqueuing',
        });
        return { asyncTaskId: duplicateQueueTaskId };
      }
      this.sentry.instance().captureException(error, {
        level: 'error',
        extra: { userId, asyncTaskId: asyncTask.id, queue: BullQueues.ROUTINE_SUGGESTIONS },
      });
      throw error;
    }

    return { asyncTaskId: asyncTask.id };
  }

  private computeRequestHash(dto: CreateHabitWithAiDto, userId: string): string {
    const payload = {
      userId,
      routine: dto.routine ?? null,
      routineDuration: dto.routine_duration ?? null,
      goals: (dto.user_goals ?? []).map((goal) => goal.trim().toLowerCase()).sort(),
      prompt: dto.prompt ?? '',
    };
    return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  }
}
