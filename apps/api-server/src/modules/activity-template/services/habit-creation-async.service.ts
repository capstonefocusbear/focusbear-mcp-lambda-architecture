import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { createHash } from 'crypto';
import { InjectSentry, SentryService } from '@app/observability';
import { AsyncTaskService } from '../../async-task/services/async-task.service';
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
    const metadata = {
      taskType: 'habit-creation',
      userId,
      goalCount: dto.user_goals?.length ?? 0,
      routine: dto.routine ?? null,
      durationMinutes: dto.routine_duration ?? null,
      source: source ?? 'unknown',
      requestHash: this.computeRequestHash(dto, userId),
    };

    const asyncTask = await this.asyncTaskService.createAsyncTask({ metadata });

    try {
      await this.routineSuggestionsQueue.add(
        BullWorkers.PROCESS_HABIT_CREATION,
        {
          asyncTaskId: asyncTask.id,
          userId,
          request: dto,
          requestHash: metadata.requestHash,
        } satisfies HabitCreationJobData,
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
