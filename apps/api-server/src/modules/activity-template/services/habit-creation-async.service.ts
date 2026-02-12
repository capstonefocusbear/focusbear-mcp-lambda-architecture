import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { createHash } from 'crypto';
import { InjectSentry, SentryService } from '@app/observability';
import { AsyncTaskService } from '../../async-task/services/async-task.service';
import { AsyncTaskStatus } from '../../async-task/domain/async-task-status.enum';
import { BullQueues, BullWorkers } from '../../../shared/utils/constants';
import { CreateHabitWithAiDto } from '../dto/create-habit-with-ai.dto';

export interface HabitCreationJobData {
  asyncTaskId: string;
  userId: string;
  request: CreateHabitWithAiDto;
  requestHash: string;
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
    const existingTask = await this.asyncTaskService.findActiveTaskByRequestHash(
      HabitCreationAsyncService.TASK_TYPE,
      userId,
      requestHash,
    );
    if (existingTask?.id) {
      return { asyncTaskId: existingTask.id };
    }
    const existingQueueTaskId = await this.reuseInFlightOrCleanupTerminalJob(jobId);
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
      const inFlightAsyncTaskId = await this.getInFlightAsyncTaskIdByJobId(queuedJobId);
      if (inFlightAsyncTaskId && inFlightAsyncTaskId !== asyncTask.id) {
        await this.asyncTaskService.updateStatusWithMetadata(asyncTask.id, AsyncTaskStatus.FAILED, metadata, {
          processingFailed: new Date(),
          duplicateOfAsyncTaskId: inFlightAsyncTaskId,
          error: 'Duplicate queue job detected after enqueue',
        });
        return { asyncTaskId: inFlightAsyncTaskId };
      }
    } catch (error) {
      const duplicateQueueTaskId = await this.getInFlightAsyncTaskIdByJobId(jobId);
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

  private async reuseInFlightOrCleanupTerminalJob(jobId: string): Promise<string | null> {
    const existingJob = await this.routineSuggestionsQueue.getJob(jobId);
    if (!existingJob) {
      return null;
    }

    const state = await existingJob.getState();
    const existingAsyncTaskId = typeof existingJob.data?.asyncTaskId === 'string' ? existingJob.data.asyncTaskId : null;

    if (['waiting', 'active', 'delayed', 'paused'].includes(state) && existingAsyncTaskId) {
      return existingAsyncTaskId;
    }

    if (['completed', 'failed'].includes(state)) {
      try {
        await existingJob.remove();
      } catch (error) {
        this.sentry.instance().captureException(error, {
          level: 'warning',
          extra: { jobId, state, queue: BullQueues.ROUTINE_SUGGESTIONS },
        });
      }
    }

    return null;
  }

  private async getInFlightAsyncTaskIdByJobId(jobId: string): Promise<string | null> {
    const existingJob = await this.routineSuggestionsQueue.getJob(jobId);
    if (!existingJob) {
      return null;
    }

    const state = await existingJob.getState();
    if (!['waiting', 'active', 'delayed', 'paused'].includes(state)) {
      return null;
    }

    return typeof existingJob.data?.asyncTaskId === 'string' ? existingJob.data.asyncTaskId : null;
  }
}
