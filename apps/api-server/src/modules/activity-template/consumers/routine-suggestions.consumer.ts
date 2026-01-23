import { Logger } from '@nestjs/common';
import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { InjectSentry, SentryService } from '@app/observability';
import { PusherService } from '@app/pusher';
import { RoutineSuggestionsJobData } from '../services/routine-suggestions-async.service';
import { BullQueues, BullWorkers } from '../../../shared/utils/constants';
import { AsyncTaskService } from '../../async-task/services/async-task.service';
import { AsyncTaskStatus } from '../../async-task/domain/async-task-status.enum';
import { ActivityLibraryService } from '../services/activity-library.service';
import { HabitCreationJobData } from '../services/habit-creation-async.service';

@Processor(BullQueues.ROUTINE_SUGGESTIONS)
export class RoutineSuggestionsConsumer {
  private readonly logger = new Logger(RoutineSuggestionsConsumer.name);

  constructor(
    @InjectSentry() private readonly sentry: SentryService,
    private readonly asyncTaskService: AsyncTaskService,
    private readonly activityLibraryService: ActivityLibraryService,
    private readonly pusher: PusherService,
  ) {}

  @Process(BullWorkers.PROCESS_ROUTINE_SUGGESTIONS)
  async handleRoutineSuggestions(job: Job<RoutineSuggestionsJobData>): Promise<void> {
    const { asyncTaskId, userId, request, requestHash } = job.data;
    const attempt = job.attemptsMade + 1;
    const baseMetadata = {
      taskType: 'routine-suggestions',
      userId,
      goalCount: request.user_goals?.length ?? 0,
      routine: request.routine ?? null,
      durationMinutes: request.routine_duration ?? null,
      groupByGoals: request.groupByGoals ?? false,
      requestHash,
    };

    await this.asyncTaskService.updateStatusWithMetadata(asyncTaskId, AsyncTaskStatus.PROCESSING, baseMetadata, {
      processingStartedAt: new Date(),
      attempt,
    });

    try {
      const result = await this.activityLibraryService.getActivitiesRelatedToUserGoals(request, userId, {
        asyncTaskId,
        requestHash,
      });

      await this.asyncTaskService.updateStatusWithMetadata(asyncTaskId, AsyncTaskStatus.COMPLETED, baseMetadata, {
        completedAt: new Date(),
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

      await this.asyncTaskService.updateStatusWithMetadata(asyncTaskId, AsyncTaskStatus.FAILED, baseMetadata, {
        failedAt: new Date(),
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
    }
  }

  @Process(BullWorkers.PROCESS_HABIT_CREATION)
  async handleHabitCreation(job: Job<HabitCreationJobData>): Promise<void> {
    const { asyncTaskId, userId, request, requestHash } = job.data;
    const attempt = job.attemptsMade + 1;
    const baseMetadata = {
      taskType: 'habit-creation',
      userId,
      goalCount: request.user_goals?.length ?? 0,
      routine: request.routine ?? null,
      durationMinutes: request.routine_duration ?? null,
      requestHash,
    };

    await this.asyncTaskService.updateStatusWithMetadata(asyncTaskId, AsyncTaskStatus.PROCESSING, baseMetadata, {
      processingStartedAt: new Date(),
      attempt,
    });

    try {
      const result = await this.activityLibraryService.createHabitWithAi(request, userId);

      await this.asyncTaskService.updateStatusWithMetadata(asyncTaskId, AsyncTaskStatus.COMPLETED, baseMetadata, {
        completedAt: new Date(),
        result,
      });

      await this.pusher.trigger(`private-${userId}`, 'habit-creation.completed', {
        asyncTaskId,
        status: 'completed',
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

      await this.asyncTaskService.updateStatusWithMetadata(asyncTaskId, AsyncTaskStatus.FAILED, baseMetadata, {
        failedAt: new Date(),
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
    }
  }
}
