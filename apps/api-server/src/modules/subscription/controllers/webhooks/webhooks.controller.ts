import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { WebhookHandlerStrategy } from '../../services/webhook-handler/webhook-handler.strategy';

@Controller('subscription/webhooks')
export class WebhooksController {
  constructor(private readonly webhookStrategy: WebhookHandlerStrategy) {}

  @Post()
  @HttpCode(200)
  async handleRevenueCatWebhooks(@Body() { event }) {
    console.log({ test: event.type });
    return this.webhookStrategy[event.type](event);
  }
}
