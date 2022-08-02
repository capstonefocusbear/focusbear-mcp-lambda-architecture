import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { constants } from '../../config';
import { WebhooksController } from './controllers/webhooks/webhooks.controller';
import { HasSubscription } from './guards/has-subscription/has-subscription.guard';
import { SubscriptionRepository } from './repositories/subscription.repository';
import { SubscriptionStatusService } from './services/subscription-status/subscription-status.service';
import { SyncSubscriptionStatusStrategy } from './services/subscription-status/sync-subscription-status.strategy';
import { SubscriptionService } from './services/subscription/subscription.service';
import { WebhookHandlerStrategy } from './services/webhook-handler/webhook-handler.strategy';

@Module({
  providers: [
    SubscriptionService,
    SubscriptionRepository,
    SubscriptionStatusService,
    SyncSubscriptionStatusStrategy,
    WebhookHandlerStrategy,
    HasSubscription,
  ],
  exports: [SubscriptionService, SubscriptionStatusService, HasSubscription],
  imports: [ConfigModule.forRoot({ load: [constants] })],
  controllers: [WebhooksController],
})
export class SubscriptionModule {}
