import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { InjectSentry, SentryService } from '@app/observability';
import { PusherService } from '@app/pusher';
import { BullQueues, BullWorkers } from '../../../shared/utils/constants';

export interface SettingsNotificationJobData {
  userId: string;
  deviceId?: string;
  language?: string;
}

@Processor(BullQueues.SETTINGS_NOTIFICATION)
export class SettingsNotificationConsumer {
  private readonly logger = new Logger(SettingsNotificationConsumer.name);

  constructor(private readonly pusher: PusherService, @InjectSentry() private readonly sentryService: SentryService) {}

  @Process(BullWorkers.SEND_SETTINGS_NOTIFICATION)
  async handleSettingsNotification(job: Job<SettingsNotificationJobData>): Promise<void> {
    const startTime = Date.now();
    const { userId, deviceId } = job.data;

    this.logger.debug(`Processing settings notification job ${job.id ?? 'unknown'}`, {
      userId,
      deviceId,
      attempt: job.attemptsMade + 1,
    });

    this.sentryService.instance().addBreadcrumb({
      category: 'Consumer',
      level: 'debug',
      message: 'Processing settings notification job',
      data: {
        userId,
        deviceId,
        jobId: job.id?.toString(),
        attempt: (job.attemptsMade + 1).toString(),
      },
    });

    try {
      await this.pusher.trigger(`private-${userId}`, 'settings-updated', { device_id: deviceId });
    } catch (error) {
      const isLastAttempt = job.attemptsMade + 1 >= (job.opts.attempts ?? 3);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      this.logger.warn(
        `Failed to send settings notification for job ${job.id ?? 'unknown'} (attempt ${job.attemptsMade + 1})`,
        {
          userId,
          deviceId,
          isLastAttempt,
          error: errorMessage,
          durationMs: Date.now() - startTime,
        },
      );

      this.sentryService.instance().captureException(error, {
        level: isLastAttempt ? 'error' : 'warning',
        tags: {
          consumer: 'settings-notification',
          job: BullWorkers.SEND_SETTINGS_NOTIFICATION,
          jobId: job.id?.toString(),
          attempt: (job.attemptsMade + 1).toString(),
          isLastAttempt: isLastAttempt.toString(),
        },
        extra: {
          userId,
          deviceId,
          durationMs: Date.now() - startTime,
          errorMessage,
        },
      });

      // Re-throw to trigger Bull's retry mechanism
      throw error;
    }
  }
}
