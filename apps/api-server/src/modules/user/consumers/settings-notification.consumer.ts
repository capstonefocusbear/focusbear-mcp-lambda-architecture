import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { InjectSentry, SentryService } from '@app/observability';
import { PusherService } from '@app/pusher';
import { BullQueues, BullWorkers } from '../../../shared/utils/constants';

export interface SettingsNotificationJobData {
  userId: string;
  deviceId: string;
}

@Processor(BullQueues.SETTINGS_NOTIFICATION)
export class SettingsNotificationConsumer {
  constructor(private readonly pusher: PusherService, @InjectSentry() private readonly sentryService: SentryService) {}

  @Process(BullWorkers.SEND_SETTINGS_NOTIFICATION)
  async handleSettingsNotification(job: Job<SettingsNotificationJobData>): Promise<void> {
    const startTime = Date.now();
    const { userId, deviceId } = job.data;

    // Entry log to confirm handler is being called (before any async operations)
    // eslint-disable-next-line no-console
    console.log('[SettingsNotificationConsumer] Processing job', {
      jobId: job.id,
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

      // eslint-disable-next-line no-console
      console.log('[SettingsNotificationConsumer] Settings notification sent successfully', {
        userId,
        deviceId,
        durationMs: Date.now() - startTime,
      });
    } catch (error) {
      const isLastAttempt = job.attemptsMade + 1 >= (job.opts.attempts ?? 3);

      // eslint-disable-next-line no-console
      console.error('[SettingsNotificationConsumer] Failed to send notification', {
        jobId: job.id,
        userId,
        deviceId,
        attempt: job.attemptsMade + 1,
        isLastAttempt,
        error: error.message,
        durationMs: Date.now() - startTime,
      });

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
          errorMessage: error.message,
        },
      });

      // Re-throw to trigger Bull's retry mechanism
      throw error;
    }
  }
}
