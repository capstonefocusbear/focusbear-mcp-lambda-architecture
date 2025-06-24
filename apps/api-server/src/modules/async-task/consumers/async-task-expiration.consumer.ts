import { Process, Processor } from '@nestjs/bull';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { AsyncTaskService } from '../services/async-task.service';
import { BullQueues, BullWorkers } from '../../../shared/utils/constants';

@Processor(BullQueues.ASYNC_TASK_EXPIRATION)
export class AsyncTaskExpirationConsumer {
  constructor(
    @InjectSentry() private readonly sentryService: SentryService,
    private readonly asyncTaskService: AsyncTaskService,
  ) {}

  @Process(BullWorkers.CHECK_EXPIRED_TASKS)
  async checkExpiredTasks() {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Consumer',
        level: 'debug',
        message: 'Checking for expired async tasks',
      });

      const expiredCount = await this.asyncTaskService.markExpiredTasksAsFailed();

      if (expiredCount > 0) {
        this.sentryService.instance().addBreadcrumb({
          category: 'Consumer',
          level: 'info',
          message: 'Marked expired tasks as failed',
          data: {
            count: expiredCount,
          },
        });
      }

      return { expiredCount };
    } catch (error) {
      this.sentryService.instance().captureException(error, {
        level: 'error',
        tags: { context: 'async-task-expiration' },
      });
      throw error;
    }
  }
}
