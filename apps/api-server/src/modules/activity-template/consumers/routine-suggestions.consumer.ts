import { Logger, Optional } from '@nestjs/common';
import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { ConfigService } from '@nestjs/config';
import { InjectSentry, SentryService, emitAiPipelineMetrics } from '@app/observability';
import { PusherService } from '@app/pusher';
import { RoutineSuggestionsJobData } from '../services/routine-suggestions-async.service';
import { BullQueues, BullWorkers } from '../../../shared/utils/constants';
import { AsyncTaskService } from '../../async-task/services/async-task.service';
import { AsyncTaskStatus } from '../../async-task/domain/async-task-status.enum';
import { ActivityLibraryService } from '../services/activity-library.service';
import { HabitCreationJobData } from '../services/habit-creation-async.service';
import { MetricsConfig } from '../../../config/metrics.config';

const ROUTINE_SUGGESTIONS_PIPELINE = 'routine-suggestions';
const ROUTINE_SUGGESTIONS_OPERATION = 'getActivitiesRelatedToUserGoals';
const HABIT_CREATION_PIPELINE = 'habit-creation';
const HABIT_CREATION_OPERATION = 'createHabitWithAi';

@Processor(BullQueues.ROUTINE_SUGGESTIONS)
export class RoutineSuggestionsConsumer {
  private readonly logger = new Logger(RoutineSuggestionsConsumer.name);

  constructor(
    @InjectSentry() private readonly sentry: SentryService,
    private readonly asyncTaskService: AsyncTaskService,
    private readonly activityLibraryService: ActivityLibraryService,
    private readonly pusher: PusherService,
    @Optional() private readonly configService?: ConfigService,
  ) {}

  @Process(BullWorkers.PROCESS_ROUTINE_SUGGESTIONS)
  async handleRoutineSuggestions(job: Job<RoutineSuggestionsJobData>): Promise<void> {
    const { asyncTaskId, userId, request, requestHash, enqueuedAt } = job.data;
    const attempt = job.attemptsMade + 1;
    const processingStartedAt = new Date();
    let completedAt: Date | undefined;
    let failedAt: Date | undefined;
    const baseMetadata = {
      taskType: 'routine-suggestions',
      userId,
      goalCount: request.user_goals?.length ?? 0,
      routine: request.routine ?? null,
      durationMinutes: request.routine_duration ?? null,
      groupByGoals: request.groupByGoals ?? false,
      requestHash,
      enqueuedAt,
    };

    await this.asyncTaskService.updateStatusWithMetadata(asyncTaskId, AsyncTaskStatus.PROCESSING, baseMetadata, {
      processingStartedAt,
      attempt,
    });

    try {
      const result = await this.activityLibraryService.getActivitiesRelatedToUserGoals(request, userId, {
        asyncTaskId,
        requestHash,
      });

      completedAt = new Date();
      await this.asyncTaskService.updateStatusWithMetadata(asyncTaskId, AsyncTaskStatus.COMPLETED, baseMetadata, {
        completedAt,
        result,
      });

      const payload = {
        asyncTaskId,
        status: 'completed',
      };
      const payloadBytes = Buffer.byteLength(JSON.stringify(payload), 'utf8');
      this.logger.debug(
        `RoutineSuggestions:pusherPayload ${JSON.stringify({
          asyncTaskId,
          userId,
          payloadBytes,
        })}`,
      );
      await this.pusher.trigger(`private-${userId}`, 'routine-suggestions.completed', payload);

      await this.emitAsyncLatencyMetrics({
        pipeline: ROUTINE_SUGGESTIONS_PIPELINE,
        operation: ROUTINE_SUGGESTIONS_OPERATION,
        success: true,
        enqueuedAt,
        processingStartedAt,
        completedAt,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      this.sentry.instance().captureException(error, {
        level: 'error',
        extra: {
          asyncTaskId,
          userId,
          attempt,
        },
      });

      failedAt = new Date();
      await this.asyncTaskService.updateStatusWithMetadata(asyncTaskId, AsyncTaskStatus.FAILED, baseMetadata, {
        failedAt,
        errorMessage,
      });

      try {
        await this.pusher.trigger(`private-${userId}`, 'routine-suggestions.completed', {
          asyncTaskId,
          status: 'failed',
          errorMessage,
        });
      } catch (pusherError) {
        this.sentry.instance().captureException(pusherError, {
          level: 'warning',
          tags: { service: 'pusher-channels', operation: 'trigger', event: 'routine-suggestions.completed' },
          extra: { asyncTaskId, userId, context: 'failed to send failure notification' },
        });
      }

      await this.emitAsyncLatencyMetrics({
        pipeline: ROUTINE_SUGGESTIONS_PIPELINE,
        operation: ROUTINE_SUGGESTIONS_OPERATION,
        success: false,
        enqueuedAt,
        processingStartedAt,
        completedAt: failedAt,
      });
    }
  }

  @Process(BullWorkers.PROCESS_HABIT_CREATION)
  async handleHabitCreation(job: Job<HabitCreationJobData>): Promise<void> {
    const { asyncTaskId, userId, request, requestHash, enqueuedAt } = job.data;
    const attempt = job.attemptsMade + 1;
    const processingStartedAt = new Date();
    let completedAt: Date | undefined;
    let failedAt: Date | undefined;
    const baseMetadata = {
      taskType: 'habit-creation',
      userId,
      goalCount: request.user_goals?.length ?? 0,
      routine: request.routine ?? null,
      durationMinutes: request.routine_duration ?? null,
      requestHash,
      enqueuedAt,
    };

    await this.asyncTaskService.updateStatusWithMetadata(asyncTaskId, AsyncTaskStatus.PROCESSING, baseMetadata, {
      processingStartedAt,
      attempt,
    });

    try {
      const result = await this.activityLibraryService.createHabitWithAi(request, userId);

      completedAt = new Date();
      await this.asyncTaskService.updateStatusWithMetadata(asyncTaskId, AsyncTaskStatus.COMPLETED, baseMetadata, {
        completedAt,
        result,
      });

      await this.pusher.trigger(`private-${userId}`, 'habit-creation.completed', {
        asyncTaskId,
        status: 'completed',
      });

      await this.emitAsyncLatencyMetrics({
        pipeline: HABIT_CREATION_PIPELINE,
        operation: HABIT_CREATION_OPERATION,
        success: true,
        enqueuedAt,
        processingStartedAt,
        completedAt,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      this.sentry.instance().captureException(error, {
        level: 'error',
        extra: {
          asyncTaskId,
          userId,
          attempt,
        },
      });

      failedAt = new Date();
      await this.asyncTaskService.updateStatusWithMetadata(asyncTaskId, AsyncTaskStatus.FAILED, baseMetadata, {
        failedAt,
        errorMessage,
      });

      try {
        await this.pusher.trigger(`private-${userId}`, 'habit-creation.completed', {
          asyncTaskId,
          status: 'failed',
          errorMessage,
        });
      } catch (pusherError) {
        this.sentry.instance().captureException(pusherError, {
          level: 'warning',
          tags: { service: 'pusher-channels', operation: 'trigger', event: 'habit-creation.completed' },
          extra: { asyncTaskId, userId, context: 'failed to send failure notification' },
        });
      }

      await this.emitAsyncLatencyMetrics({
        pipeline: HABIT_CREATION_PIPELINE,
        operation: HABIT_CREATION_OPERATION,
        success: false,
        enqueuedAt,
        processingStartedAt,
        completedAt: failedAt,
      });
    }
  }

  private getMetricsConfig(): MetricsConfig {
    return (
      this.configService?.get<MetricsConfig>('metrics') || {
        emitQueueMetrics: true,
        emitUserActivityMetrics: true,
        pollIntervalMs: 60_000,
        namespace: 'FocusBear/Queues',
        service: 'api',
        aiPipelineNamespace: 'FocusBear/Queues',
        aiPipelineService: 'api',
        environment: 'prod',
        logQueueFailures: true,
      }
    );
  }

  private async emitAsyncLatencyMetrics({
    pipeline,
    operation,
    success,
    enqueuedAt,
    processingStartedAt,
    completedAt,
  }: {
    pipeline: string;
    operation: string;
    success: boolean;
    enqueuedAt?: string;
    processingStartedAt: Date;
    completedAt?: Date;
  }): Promise<void> {
    const metrics = this.getMetricsConfig();
    const shouldEmitMetrics = Boolean(metrics.emitUserActivityMetrics || metrics.emitQueueMetrics);
    if (!shouldEmitMetrics) {
      return;
    }

    const enqueuedAtMs = this.parseTimestamp(enqueuedAt);
    const processingStartedAtMs = processingStartedAt.getTime();
    const completedAtMs = completedAt?.getTime();
    if (typeof enqueuedAtMs !== 'number' || typeof completedAtMs !== 'number') {
      return;
    }

    try {
      await emitAiPipelineMetrics({
        namespace: metrics.aiPipelineNamespace,
        environment: metrics.environment,
        service: metrics.aiPipelineService,
        pipeline,
        operation,
        success,
        durationMs: Math.max(0, completedAtMs - processingStartedAtMs),
        stageDurationsMs: {},
        endToEndDurationMs: Math.max(0, completedAtMs - enqueuedAtMs),
        queueWaitMs: Math.max(0, processingStartedAtMs - enqueuedAtMs),
        emitDurationMetric: false,
        emitSuccessMetric: false,
      });
    } catch {
      // Best-effort only.
    }
  }

  private parseTimestamp(value?: string): number | undefined {
    const parsed = Date.parse(value ?? '');
    return Number.isFinite(parsed) ? parsed : undefined;
  }
}
