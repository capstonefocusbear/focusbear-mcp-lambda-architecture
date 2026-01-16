import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { WebhookSubscriptionController } from './controllers/webhook-subscription.controller';
import { ExternalApiController } from './controllers/external-api.controller';
import { WebhookSubscriptionService } from './services/webhook-subscription.service';
import { WebhookDispatcherService } from './services/webhook-dispatcher.service';
import { WebhookSubscriptionRepository } from './repositories/webhook-subscription.repository';
import { WebhookConsumer } from './consumers/webhook.consumer';
import { BullQueues } from '../../shared/utils/constants';
import { UserModule } from '../user/user.module';
import { FocusModeModule } from '../focus-mode/focus-mode.module';
import { ActivityModule } from '../activity/activity.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: BullQueues.WEBHOOK,
    }),
    forwardRef(() => UserModule),
    forwardRef(() => FocusModeModule),
    forwardRef(() => ActivityModule),
  ],
  controllers: [WebhookSubscriptionController, ExternalApiController],
  providers: [WebhookSubscriptionService, WebhookDispatcherService, WebhookSubscriptionRepository, WebhookConsumer],
  exports: [WebhookDispatcherService],
})
export class WebhookModule {}
