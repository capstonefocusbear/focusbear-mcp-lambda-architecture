import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { createHmac } from 'crypto';
import axios from 'axios';
import { InjectSentry, SentryService } from '@app/observability';
import { WebhookSubscriptionRepository } from '../repositories/webhook-subscription.repository';
import { WebhookEventType } from '../domain/webhook-event-type.enum';
import { WebhookPayload } from '../domain/webhook-payload.model';
import { BullQueues, BullWorkers } from '../../../shared/utils/constants';
import { isPublicWebhookUrl, resolvesToPublicAddress } from '../../../shared/utils/webhook-url';

@Injectable()
export class WebhookDispatcherService {
  private readonly MAX_FAILURE_COUNT = 5;

  private readonly WEBHOOK_TIMEOUT_MS = 10000;

  constructor(
    private readonly webhookSubscriptionRepository: WebhookSubscriptionRepository,
    @InjectSentry() private readonly sentryService: SentryService,
    @InjectQueue(BullQueues.WEBHOOK) private readonly webhookQueue: Queue,
  ) {}

  async dispatchEvent(userId: string, eventType: WebhookEventType, data: Record<string, any>): Promise<void> {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Webhook',
        level: 'debug',
        message: 'Dispatching webhook event',
        data: { userId, eventType },
      });

      const subscriptions = await this.webhookSubscriptionRepository.findByEventType(userId, eventType);

      if (subscriptions.length === 0) {
        return;
      }

      const payload: WebhookPayload = {
        event_type: eventType,
        timestamp: new Date().toISOString(),
        user_id: userId,
        data,
      };

      const validSubscriptions = subscriptions.filter((subscription) => {
        if (subscription.failure_count >= this.MAX_FAILURE_COUNT) {
          this.sentryService.instance().addBreadcrumb({
            category: 'Webhook',
            level: 'warning',
            message: 'Skipping webhook due to too many failures',
            data: { subscriptionId: subscription.id, failureCount: subscription.failure_count },
          });
          return false;
        }
        return true;
      });

      await Promise.all(
        validSubscriptions.map((subscription) =>
          this.webhookQueue.add(
            BullWorkers.SEND_WEBHOOK,
            {
              subscriptionId: subscription.id,
              url: subscription.url,
              secret: subscription.secret,
              payload,
            },
            {
              attempts: 3,
              backoff: {
                type: 'exponential',
                delay: 2000,
              },
              removeOnComplete: 100,
              removeOnFail: 50,
            },
          ),
        ),
      );
    } catch (error) {
      this.sentryService.instance().captureException(error, {
        level: 'warning',
        tags: { webhook: 'dispatch_event' },
        extra: { userId, eventType },
      });
    }
  }

  async sendWebhook(
    subscriptionId: string,
    url: string,
    secret: string | null,
    payload: WebhookPayload,
  ): Promise<void> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'FocusBear-Webhook/1.0',
      'X-Webhook-Event': payload.event_type,
      'X-Webhook-Timestamp': payload.timestamp,
    };

    if (secret) {
      const signature = this.generateSignature(payload, secret);
      headers['X-Webhook-Signature'] = signature;
    }

    try {
      await this.assertWebhookUrlIsPublic(url);
      await axios.post(url, payload, {
        headers,
        timeout: this.WEBHOOK_TIMEOUT_MS,
      });

      await this.webhookSubscriptionRepository.resetFailureCount(subscriptionId);
      await this.webhookSubscriptionRepository.updateLastTriggered(subscriptionId);

      this.sentryService.instance().addBreadcrumb({
        category: 'Webhook',
        level: 'info',
        message: 'Webhook sent successfully',
        data: { subscriptionId, eventType: payload.event_type },
      });
    } catch (error) {
      await this.webhookSubscriptionRepository.incrementFailureCount(subscriptionId);

      this.sentryService.instance().addBreadcrumb({
        category: 'Webhook',
        level: 'error',
        message: 'Webhook delivery failed',
        data: {
          subscriptionId,
          eventType: payload.event_type,
          error: error.message,
          statusCode: error.response?.status,
        },
      });

      throw error;
    }
  }

  private generateSignature(payload: WebhookPayload, secret: string): string {
    const payloadString = JSON.stringify(payload);
    const digest = createHmac('sha256', secret).update(payloadString).digest('hex');
    return `sha256=${digest}`;
  }

  private async assertWebhookUrlIsPublic(url: string): Promise<void> {
    if (!isPublicWebhookUrl(url)) {
      throw new Error('Webhook URL must be a public https URL');
    }

    const { hostname } = new URL(url);
    const resolvesPublicly = await resolvesToPublicAddress(hostname);
    if (!resolvesPublicly) {
      throw new Error('Webhook URL resolves to a private or localhost address');
    }
  }
}
