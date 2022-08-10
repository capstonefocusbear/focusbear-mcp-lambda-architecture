import { Body, Controller, HttpCode, Logger, Post } from '@nestjs/common';
import { WebhookHandlerStrategy } from '../../services/webhook-handler/webhook-handler.strategy';

@Controller('subscription/webhooks')
export class WebhooksController {
  constructor(private readonly webhookStrategy: WebhookHandlerStrategy) {}

  private readonly logger: Logger = new Logger('RevenueCatWebhooks');

  @Post()
  @HttpCode(200)
  async handleRevenueCatWebhooks(@Body() { event }) {
    this.logger.log(event.type);
    return this.webhookStrategy[event.type](event);
  }
}
