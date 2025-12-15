import { Process, Processor, InjectQueue } from '@nestjs/bull';
import { InjectSentry, SentryService } from '@app/observability';
import { Job, Queue } from 'bull';
import { BullQueues, BullWorkers } from '../../../shared/utils/constants';
import { CreateCompletedActivityDto } from '../dto/create-completed-activity.dto';
import { CompletedActivityService } from '../services/completed-activity/completed-activity.service';

export interface CompletedActivityJobData {
  completedActivity: CreateCompletedActivityDto;
  user_id: string;
  completed_activity_log_id: string;
  completed_choice_log_id?: string;
  startTimeToUse: Date;
}

@Processor(BullQueues.COMPLETED_ACTIVITY)
export class CompletedActivityConsumer {
  constructor(
    @InjectSentry() private readonly sentryService: SentryService,
    private readonly completedActivityService: CompletedActivityService,
    @InjectQueue(BullQueues.COMPLETED_ACTIVITY_DLQ)
    private readonly completedActivityDlq: Queue<CompletedActivityJobData>,
  ) {}

  @Process(BullWorkers.PROCESS_COMPLETED_ACTIVITY)
  async processCompletedActivity(job: Job<CompletedActivityJobData>) {
    const { completedActivity, user_id, completed_activity_log_id } = job.data;
    const startTime = Date.now();

    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Processing completed activity background job',
        data: {
          user_id,
          completed_activity_log_id,
          activity_id: completedActivity.activity_id,
          job_id: job.id?.toString(),
          attempts: job.attemptsMade?.toString(),
        },
      });

      // Fetch the data needed for broadcast
      const [, activity, user] = await this.completedActivityService.fetchPreparatoryData(
        completedActivity.activity_id,
        user_id,
        completedActivity.choice_id,
      );

      // Use existing broadcastCompletionEvent method directly
      await this.completedActivityService.broadcastCompletionEvent(
        user_id,
        completed_activity_log_id,
        { ...completedActivity },
        activity,
        user.language,
      );

      const processingTime = Date.now() - startTime;
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Completed activity background job processed successfully',
        data: {
          user_id,
          completed_activity_log_id,
          processing_time_ms: processingTime,
        },
      });
    } catch (error) {
      const processingTime = Date.now() - startTime;
      const isLastAttempt = job.attemptsMade + 1 >= (job.opts.attempts ?? 3);

      this.sentryService.instance().captureException(error, {
        level: isLastAttempt ? 'error' : 'warning',
        tags: {
          service: 'completed-activity',
          operation: 'pusher-broadcasts',
          job_id: job.id?.toString(),
          attempts: job.attemptsMade?.toString(),
          is_last_attempt: isLastAttempt.toString(),
        },
        extra: {
          user_id,
          completed_activity_log_id,
          activity_id: completedActivity.activity_id,
          processing_time_ms: processingTime,
          error_message: error.message,
          error_stack: error.stack,
          job_data: {
            completedActivity: {
              activity_id: completedActivity.activity_id,
              choice_id: completedActivity.choice_id,
              start_time: completedActivity.start_time,
            },
            user_id,
            completed_activity_log_id,
          },
        },
      });

      console.error(
        `Background job failed: user_id=${user_id}, job_id=${job.id}, attempts=${job.attemptsMade}/${
          job.opts.attempts || 3
        }, error=${error.message}`,
      );

      if (isLastAttempt) {
        console.error(
          `Job permanently failed and will be dead-lettered: user_id=${user_id}, job_id=${job.id}, activity_id=${completedActivity.activity_id}`,
        );

        await this.completedActivityDlq.add('dead-letter', job.data, {
          removeOnComplete: false,
          removeOnFail: false,
        });
      }

      throw error;
    }
  }
}
