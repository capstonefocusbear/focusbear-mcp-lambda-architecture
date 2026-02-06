import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { InjectSentry, SentryService } from '@app/observability';
import { WebhookDispatcherService } from '../services/webhook-dispatcher.service';
import { WebhookPayload } from '../domain/webhook-payload.model';
import { BullQueues, BullWorkers } from '../../../shared/utils/constants';

interface SendWebhookJobData {
  subscriptionId: string;
  url: string;
  secret: string | null;
  payload: WebhookPayload;
}

@Processor(BullQueues.WEBHOOK)
export class WebhookConsumer {
  constructor(
    private readonly webhookDispatcherService: WebhookDispatcherService,
    @InjectSentry() private readonly sentryService: SentryService,
  ) {}

  @Process(BullWorkers.SEND_WEBHOOK)
  async handleSendWebhook(job: Job<SendWebhookJobData>): Promise<void> {
    const { subscriptionId, url, secret, payload } = job.data;

    this.sentryService.instance().addBreadcrumb({
      category: 'Consumer',
      level: 'debug',
      message: 'Processing webhook job',
      data: { subscriptionId, eventType: payload.event_type },
    });

    try {
      await this.webhookDispatcherService.sendWebhook(subscriptionId, url, secret, payload);
    } catch (error) {
      this.sentryService.instance().captureException(error, {
        level: 'warning',
        tags: { consumer: 'webhook', job: BullWorkers.SEND_WEBHOOK },
        extra: { subscriptionId, eventType: payload.event_type },
      });
      throw error;
    }
  }
}
