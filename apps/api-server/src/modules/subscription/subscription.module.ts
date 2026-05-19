import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { IRevenueCatOptions, RevenueCatModule } from '@app/revenue-cat';
import { IStripeOptions, StripeModule } from '@app/stripe';
import { Auth0Module } from '@app/auth0';
import { BullModule } from '@nestjs/bull';
import { constants, revenueCatConfig, stripeConfig } from '../../../../../libs/config/src';
import { TeamModule } from '../team/team.module';
import { UserModule } from '../user/user.module';
import { WebhooksController } from './controllers/webhooks/webhooks.controller';
import { HasSubscription } from './guards/has-subscription/has-subscription.guard';
import { WebhookHandlerStrategy } from './services/webhook-handler/webhook-handler.strategy';
import { StripeController } from './controllers/webhooks/stripe.controller';
import { BullQueues } from '../../shared/utils/constants';
import { HasTeamSubscription } from './guards/has-team-subscription/has-team-subscription.guard';
import { EmailModule } from '../email/email.module';
import { SubscriptionEmailService } from './services/subscription-email/subscription-email.service';

@Module({
  providers: [WebhookHandlerStrategy, HasSubscription, HasTeamSubscription, SubscriptionEmailService],
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
    BullModule.registerQueue({
      name: BullQueues.REVENUE_CAT_STATUS,
    }),
    forwardRef(() => EmailModule),
    Auth0Module.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): any => configService.get('auth0'),
    }),
  ],
  controllers: [WebhooksController, StripeController],
})
export class SubscriptionModule {}
