import { BadRequestException, Body, Controller, HttpCode, Logger, Post, RawBodyRequest, Req } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { StripeService } from '@app/stripe';
import { RevenueCatService } from '@app/revenue-cat';
import { StripeEvents } from '@app/stripe/model/stripe-events.enum';
import { WebhookHandlerStrategy } from '../../services/webhook-handler/webhook-handler.strategy';
import { Headers } from '../../../../shared/decorators/headers.decorator';
import { SubscriptionProvider } from '../../domain/subscription-provider.enum';
import { UserRepository } from '../../../user/repositories/user.repository';
import { TeamManagementService } from '../../../team/services/team-management/team-management.service';

@Controller('subscription/webhooks')
export class WebhooksController {
  constructor(
    private readonly webhookStrategy: WebhookHandlerStrategy,
    private readonly stripeService: StripeService,
    private readonly revenueCatService: RevenueCatService,
    private readonly userRepository: UserRepository,
    private readonly teamManagementService: TeamManagementService,
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
  async handleStripeWebhooks(@Req() req: RawBodyRequest<FastifyRequest>, @Headers() headers: unknown) {
    const body = req.rawBody;
    const event = await this.stripeService.decodeWebhookEvent(body, headers);
    const payload = JSON.parse(JSON.stringify(event.data.object));
    this.rcLogger.warn(event.type);
    try {
      // check if event is for team plan
      if (payload.plan.product === process.env.STRIPE_TEAM_PLAN_PRODUCT_ID) {
        await this.teamManagementService.handleChangeInTeamSubscription(event.type, payload);
      }
      if (event.type !== StripeEvents.CREATED) return null;
      // forward new subscription to RevenueCat
      const user = await this.userRepository.orm.findOne({
        where: { stripe_customer_id: payload.customer },
      });
      this.rcLogger.warn(JSON.stringify(user || 'empty'));
      const purchaseData = { app_user_id: user.id, fetch_token: payload.id };
      this.rcLogger.warn(purchaseData);
      await this.revenueCatService.createPurchase(SubscriptionProvider.stripe, purchaseData);
      return null;
    } catch (error) {
      throw new BadRequestException(error);
    }
  }
}
