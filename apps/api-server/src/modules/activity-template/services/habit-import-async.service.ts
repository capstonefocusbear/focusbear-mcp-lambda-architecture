import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { createHash } from 'crypto';
import { InjectSentry, SentryService } from '@app/observability';
import { AsyncTaskService } from '../../async-task/services/async-task.service';
import { AsyncTaskStatus } from '../../async-task/domain/async-task-status.enum';
import { HabitImportUploadedDto, HabitImportJobData } from '../dto/import-habits-from-media.dto';
import { BullQueues, BullWorkers } from '../../../shared/utils/constants';
import { getInFlightAsyncTaskIdByJobId, reuseInFlightOrCleanupTerminalJob } from './async-task-dedup.util';

@Injectable()
export class HabitImportAsyncService {
  private static readonly TASK_TYPE = 'habit-import';

  constructor(
    private readonly asyncTaskService: AsyncTaskService,
    @InjectQueue(BullQueues.HABIT_IMPORT) private readonly habitImportQueue: Queue,
    @InjectSentry() private readonly sentry: SentryService,
  ) {}

  async enqueueHabitImport(
    dto: HabitImportUploadedDto,
    userId: string,
    source?: string,
  ): Promise<{ asyncTaskId: string }> {
    const requestHash = this.computeRequestHash(dto, userId);
    const jobId = `${HabitImportAsyncService.TASK_TYPE}:${requestHash}`;
    const existingTask = await this.asyncTaskService.findActiveTaskByRequestHash(
      HabitImportAsyncService.TASK_TYPE,
      userId,
      requestHash,
    );
    if (existingTask?.id) {
      return { asyncTaskId: existingTask.id };
    }
    const existingQueueTaskId = await reuseInFlightOrCleanupTerminalJob({
      queue: this.habitImportQueue,
      queueName: BullQueues.HABIT_IMPORT,
      sentry: this.sentry,
      jobId,
    });
    if (existingQueueTaskId) {
      return { asyncTaskId: existingQueueTaskId };
    }

    const metadata = {
      taskType: HabitImportAsyncService.TASK_TYPE,
      userId,
      mediaType: dto.mediaType,
      mediaKey: dto.mediaKey,
      routineDurationMinutes: dto.routineDurationMinutes ?? null,
      routineType: dto.routineType ?? null,
      source: source ?? 'unknown',
      requestHash,
    };

    const asyncTask = await this.asyncTaskService.createAsyncTask({ metadata });

    try {
      const queuedJob = await this.habitImportQueue.add(
        BullWorkers.PROCESS_HABIT_IMPORT,
        {
          asyncTaskId: asyncTask.id,
          userId,
          mediaKey: dto.mediaKey,
          mediaType: dto.mediaType,
          routineDurationMinutes: dto.routineDurationMinutes,
          routineType: dto.routineType,
          requestHash,
        } satisfies HabitImportJobData,
        {
          jobId,
          removeOnComplete: true,
          removeOnFail: false,
          timeout: 180000, // 3 minutes for image/audio processing
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
        },
      );

      const queuedJobId =
        typeof queuedJob?.id === 'string' || typeof queuedJob?.id === 'number' ? String(queuedJob.id) : jobId;
      const inFlightAsyncTaskId = await getInFlightAsyncTaskIdByJobId(this.habitImportQueue, queuedJobId);
      if (inFlightAsyncTaskId && inFlightAsyncTaskId !== asyncTask.id) {
        await this.asyncTaskService.updateStatusWithMetadata(asyncTask.id, AsyncTaskStatus.FAILED, metadata, {
          processingFailed: new Date(),
          duplicateOfAsyncTaskId: inFlightAsyncTaskId,
          error: 'Duplicate queue job detected after enqueue',
        });
        return { asyncTaskId: inFlightAsyncTaskId };
      }
    } catch (error) {
      const duplicateQueueTaskId = await getInFlightAsyncTaskIdByJobId(this.habitImportQueue, jobId);
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
        extra: { userId, asyncTaskId: asyncTask.id, queue: BullQueues.HABIT_IMPORT },
      });
      throw error;
    }

    return { asyncTaskId: asyncTask.id };
  }

  private computeRequestHash(dto: HabitImportUploadedDto, userId: string): string {
    const payload = {
      userId,
      mediaKey: dto.mediaKey,
      mediaType: dto.mediaType,
      routineDurationMinutes: dto.routineDurationMinutes ?? null,
      routineType: dto.routineType ?? null,
    };
    return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  }
}
