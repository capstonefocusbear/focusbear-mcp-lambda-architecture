import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { createHash } from 'crypto';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { AsyncTaskService } from '../../async-task/services/async-task.service';
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
    const normalizedGoalCount = dto.user_goals?.length ?? 0;
    const metadata = {
      taskType: 'routine-suggestions',
      userId,
      goalCount: normalizedGoalCount,
      routine: dto.routine ?? null,
      durationMinutes: dto.routine_duration ?? null,
      groupByGoals: dto.groupByGoals ?? false,
      source: source ?? 'unknown',
      requestHash: this.computeRequestHash(dto, userId),
    };

    const asyncTask = await this.asyncTaskService.createAsyncTask({ metadata });

    try {
      await this.routineSuggestionsQueue.add(
        BullWorkers.PROCESS_ROUTINE_SUGGESTIONS,
        {
          asyncTaskId: asyncTask.id,
          userId,
          request: dto,
          requestHash: metadata.requestHash,
        } satisfies RoutineSuggestionsJobData,
        {
          jobId: asyncTask.id,
          removeOnComplete: true,
          removeOnFail: false,
          timeout: 120000,
        },
      );
    } catch (error) {
      this.sentry.instance().captureException(error, {
        level: 'error',
        extra: { userId, asyncTaskId: asyncTask.id, queue: BullQueues.ROUTINE_SUGGESTIONS },
      });
      throw error;
    }

    return { asyncTaskId: asyncTask.id };
  }

  private computeRequestHash(dto: GetRoutineSuggestionsDto, userId: string): string {
    const payload = {
      userId,
      routine: dto.routine ?? null,
      routineDuration: dto.routine_duration ?? null,
      goals: (dto.user_goals ?? []).map((goal) => goal.trim().toLowerCase()).sort(),
      groupByGoals: dto.groupByGoals ?? false,
    };
    return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  }
}
