import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { constants } from '../../config';
import { TeamModule } from '../team/team.module';
import { UserModule } from '../user/user.module';
import { WebhooksController } from './controllers/webhooks/webhooks.controller';
import { HasSubscription } from './guards/has-subscription/has-subscription.guard';
import { SubscriptionRepository } from './repositories/subscription.repository';
import { SubscriptionStatusService } from './services/subscription-status/subscription-status.service';
import { SyncSubscriptionStatusStrategy } from './services/subscription-status/sync-subscription-status.strategy';
import { SubscriptionService } from './services/subscription/subscription.service';
import { WebhookHandlerStrategy } from './services/webhook-handler/webhook-handler.strategy';
import { IRevenueCatOptions, RevenueCatModule } from '../../../../../libs/revenue-cat/src';

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
  imports: [
    ConfigModule.forRoot({ load: [constants] }),
    TeamModule,
    forwardRef(() => UserModule),
    RevenueCatModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): IRevenueCatOptions => configService.get('revenueCat'),
    }),
  ],
  controllers: [WebhooksController],
})
export class SubscriptionModule {}
