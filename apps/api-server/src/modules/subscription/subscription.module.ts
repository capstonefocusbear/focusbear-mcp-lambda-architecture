import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { constants, revenueCatConfig, stripeConfig } from '../../config';
import { TeamModule } from '../team/team.module';
import { UserModule } from '../user/user.module';
import { WebhooksController } from './controllers/webhooks/webhooks.controller';
import { HasSubscription } from './guards/has-subscription/has-subscription.guard';
import { WebhookHandlerStrategy } from './services/webhook-handler/webhook-handler.strategy';
import { IRevenueCatOptions, RevenueCatModule } from '../../../../../libs/revenue-cat/src';
import { IStripeOptions, StripeModule } from '../../../../../libs/stripe/src';
import { StripeController } from './controllers/webhooks/stripe.controller';

@Module({
  providers: [WebhookHandlerStrategy, HasSubscription],
  exports: [HasSubscription],
  imports: [
    ConfigModule.forRoot({ load: [constants, stripeConfig, revenueCatConfig] }),
    TeamModule,
    forwardRef(() => UserModule),
    RevenueCatModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): IRevenueCatOptions => configService.get('revenueCat'),
    }),
    StripeModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): IStripeOptions => configService.get('stripeConfig'),
    }),
  ],
  controllers: [WebhooksController, StripeController],
})
export class SubscriptionModule {}
