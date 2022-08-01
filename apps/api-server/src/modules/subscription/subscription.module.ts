import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { constants } from '../../config';
import { SubscriptionRepository } from './repositories/subscription.repository';
import { SubscriptionService } from './services/subscription/subscription.service';

@Module({
  providers: [SubscriptionService, SubscriptionRepository],
  exports: [SubscriptionService],
  imports: [ConfigModule.forRoot({ load: [constants] })],
})
export class SubscriptionModule {}
