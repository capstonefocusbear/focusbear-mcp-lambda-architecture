import { Process, Processor } from '@nestjs/bull';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { Job } from 'bull';
import { BullQueues, BullWorkers } from '../../../shared/utils/constants';
import { CreateCompletedActivityDto } from '../dto/create-completed-activity.dto';
import { CompletedActivityService } from '../services/completed-activity/completed-activity.service';

export interface CompletedActivityJobData {
  completedActivity: CreateCompletedActivityDto;
  headers: any;
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
  ) {}

  @Process(BullWorkers.PROCESS_COMPLETED_ACTIVITY)
  async processCompletedActivity(job: Job<CompletedActivityJobData>) {
    const { completedActivity, user_id, completed_activity_log_id } = job.data;
    const startTime = Date.now();

    try {
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
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.sentryService.instance().captureException(error, {
        level: 'error',
        tags: {
          service: 'completed-activity',
          operation: 'pusher-broadcasts',
          job_id: job.id?.toString(),
          attempts: job.attemptsMade?.toString(),
        },
        extra: {
          user_id,
          completed_activity_log_id,
          activity_id: completedActivity.activity_id,
          processing_time_ms: processingTime,
          error_message: error.message,
          error_stack: error.stack,
        },
      });

      console.error(
        `Background job failed: user_id=${user_id}, job_id=${job.id}, attempts=${job.attemptsMade}, error=${error.message}`,
      );
      throw error;
    }
  }
}
