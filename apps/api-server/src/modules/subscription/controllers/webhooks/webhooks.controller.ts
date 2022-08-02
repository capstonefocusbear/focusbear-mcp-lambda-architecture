import { Controller, HttpCode, Post } from '@nestjs/common';
import { WebhookHandlerStrategy } from '../../services/webhook-handler/webhook-handler.strategy';

@Controller('subscription/webhooks')
export class WebhooksController {
  constructor(private readonly webhookStrategy: WebhookHandlerStrategy) {}

  @Post()
  @HttpCode(200)
  async handleRevenueCatWebhooks({ type }) {
    const strategy = this.webhookStrategy[type];
    return strategy ? strategy() : null;
  }
}
