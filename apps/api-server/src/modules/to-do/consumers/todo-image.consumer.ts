/* eslint-disable no-console */
import { Process, Processor } from '@nestjs/bull';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { Job } from 'bull';
import { OpenAIService } from '@app/openai';
import { R2Service } from '@app/r2';
import axios from 'axios';
import { BullQueues, BullWorkers, S3_BUCKET_USAGE_IMAGES } from '../../../shared/utils/constants';
import { AsyncTaskService } from '../../async-task/services/async-task.service';
import { AsyncTaskStatus } from '../../async-task/domain/async-task-status.enum';

@Processor(BullQueues.TODO_IMAGE)
export class TodoImageConsumer {
  constructor(
    @InjectSentry() private readonly sentryService: SentryService,
    private readonly openAIService: OpenAIService,
    private readonly r2Service: R2Service,
    private readonly asyncTaskService: AsyncTaskService,
  ) {}

  @Process(BullWorkers.PROCESS_TODO_IMAGE)
  async processTodoImage(
    job: Job<{
      userId: string;
      imageKey: string;
      asyncTaskId?: string;
    }>,
  ) {
    const { userId, imageKey, asyncTaskId } = job.data;

    const baseMetadata = {
      taskType: 'todo-image-processing',
      userId,
      imageKey,
    };

    // Update task status to processing
    await this.asyncTaskService.updateStatusWithMetadata(asyncTaskId, AsyncTaskStatus.PROCESSING, baseMetadata, {
      processingStarted: new Date(),
    });

    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Processing todo image from R2',
        data: {
          userId,
          imageKey,
        },
      });

      const imageUrl = await this.r2Service.getPresignedUrl(S3_BUCKET_USAGE_IMAGES, imageKey);

      const imageResponse = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
      });
      const base64 = Buffer.from(imageResponse.data, 'binary').toString('base64');
      const imageBuffer = `data:image/png;base64,${base64}`;

      const now = new Date().toISOString();

      const tasks = await this.openAIService.extractTodosFromImage(imageBuffer, now);

      if (!tasks) {
        throw new Error('No todos detected in image');
      }

      // Update task status to completed
      await this.asyncTaskService.updateStatusWithMetadata(asyncTaskId, AsyncTaskStatus.COMPLETED, baseMetadata, {
        processingCompleted: new Date(),
        todosExtracted: tasks.length,
        aiResponse: tasks,
      });

      return tasks;
    } catch (error) {
      // Update task status to failed
      await this.asyncTaskService.updateStatusWithMetadata(asyncTaskId, AsyncTaskStatus.FAILED, baseMetadata, {
        processingFailed: new Date(),
        imageKey,
      });

      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }
}
