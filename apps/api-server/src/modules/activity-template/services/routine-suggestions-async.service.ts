import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { createHash } from 'crypto';
import { InjectSentry, SentryService } from '@app/observability';
import { AsyncTaskService } from '../../async-task/services/async-task.service';
import { AsyncTaskStatus } from '../../async-task/domain/async-task-status.enum';
import { GetRoutineSuggestionsDto } from '../dto/get-routine-suggestions.dto';
import { BullQueues, BullWorkers } from '../../../shared/utils/constants';

export interface RoutineSuggestionsJobData {
  asyncTaskId: string;
  userId: string;
  request: GetRoutineSuggestionsDto;
  requestHash: string;
}

@Injectable()
export class RoutineSuggestionsAsyncService {
  private static readonly TASK_TYPE = 'routine-suggestions';

  constructor(
    private readonly asyncTaskService: AsyncTaskService,
    @InjectQueue(BullQueues.ROUTINE_SUGGESTIONS) private readonly routineSuggestionsQueue: Queue,
    @InjectSentry() private readonly sentry: SentryService,
  ) {}

  async enqueueRoutineSuggestions(
    dto: GetRoutineSuggestionsDto,
    userId: string,
    source?: string,
  ): Promise<{ asyncTaskId: string }> {
    const requestHash = this.computeRequestHash(dto, userId);
    const jobId = `${RoutineSuggestionsAsyncService.TASK_TYPE}:${requestHash}`;
    const existingTask = await this.asyncTaskService.findActiveTaskByRequestHash(
      RoutineSuggestionsAsyncService.TASK_TYPE,
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

    const normalizedGoalCount = dto.user_goals?.length ?? 0;
    const metadata = {
      taskType: RoutineSuggestionsAsyncService.TASK_TYPE,
      userId,
      goalCount: normalizedGoalCount,
      routine: dto.routine ?? null,
      durationMinutes: dto.routine_duration ?? null,
      groupByGoals: dto.groupByGoals ?? false,
      source: source ?? 'unknown',
      requestHash,
    };

    const asyncTask = await this.asyncTaskService.createAsyncTask({ metadata });

    try {
      await this.routineSuggestionsQueue.add(
        BullWorkers.PROCESS_ROUTINE_SUGGESTIONS,
        {
          asyncTaskId: asyncTask.id,
          userId,
          request: dto,
          requestHash,
        } satisfies RoutineSuggestionsJobData,
        {
          jobId,
          removeOnComplete: true,
          removeOnFail: false,
          timeout: 120000,
        },
      );
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

  private computeRequestHash(dto: GetRoutineSuggestionsDto, userId: string): string {
    const normalizedGoals = (dto.user_goals ?? [])
      .map((item: any) => {
        if (typeof item === 'string') {
          return { goal: item.trim().toLowerCase(), isCustom: false };
        }
        if (item && typeof item === 'object') {
          return {
            goal: typeof item.goal === 'string' ? item.goal.trim().toLowerCase() : '',
            isCustom: item.isCustom === true,
          };
        }
        return { goal: '', isCustom: false };
      })
      .filter((entry) => entry.goal.length > 0);

    const payload = {
      userId,
      routine: dto.routine ?? null,
      routineDuration: dto.routine_duration ?? null,
      // Include `isCustom` in the hash so custom-vs-predefined intent can't collide in async caching/metadata.
      goals: normalizedGoals.map((entry) => `${entry.goal}:${entry.isCustom}`).sort(),
      groupByGoals: dto.groupByGoals ?? false,
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
