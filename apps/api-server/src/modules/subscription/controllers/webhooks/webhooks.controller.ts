import { Body, Controller, HttpCode, Logger, Post } from '@nestjs/common';
import { StripeService } from '@app/stripe';
import { WebhookHandlerStrategy } from '../../services/webhook-handler/webhook-handler.strategy';
import { Headers } from '../../../../shared/decorators/headers.decorator';
import { RawBody } from '../../../../shared/decorators/raw-body.decorator';
import { RevenueCatService } from '../../../../../../../libs/revenue-cat/src';
import { SubscriptionProvider } from '../../domain/subscription-provider.enum';
import { UserRepository } from '../../../user/repositories/user.repository';

@Controller('subscription/webhooks')
export class WebhooksController {
  constructor(
    private readonly webhookStrategy: WebhookHandlerStrategy,
    private readonly stripeService: StripeService,
    private readonly revenueCatService: RevenueCatService,
    private readonly userRepository: UserRepository,
  ) {}

  private readonly rcLogger: Logger = new Logger('RevenueCatWebhooks');

  @Post()
  @HttpCode(200)
  async handleRevenueCatWebhooks(@Body() { event }) {
    this.rcLogger.log(event.type);
    return this.webhookStrategy[event.type](event);
  }

  @Post('stripe')
  @HttpCode(200)
  async handleStripeWebhooks(@RawBody() body, @Headers() headers: unknown) {
    const event = await this.stripeService.decodeWebhookEvent(body, headers);
    if (event.type !== 'customer.subscription.created') return null;
    const { customer, id } = event.data.object as any;
    const { id: app_user_id } = await this.userRepository.orm.findOne({ where: { stripe_customer_id: customer } });
    const purchaseData = { app_user_id, fetch_token: id };
    await this.revenueCatService.createPurchase(SubscriptionProvider.stripe, purchaseData);
    return null;
  }
}
