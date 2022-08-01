import { Controller, Post } from '@nestjs/common';

@Controller('subscription/webhooks')
export class WebhooksController {
  @Post()
  async handleRevenueCatWebhooks() {
    return 'alive';
  }
}
