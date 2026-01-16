import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ApiKeyController } from './controllers/api-key.controller';
import { WebhookSubscriptionController } from './controllers/webhook-subscription.controller';
import { ExternalApiController } from './controllers/external-api.controller';
import { ApiKeyService } from './services/api-key.service';
import { WebhookSubscriptionService } from './services/webhook-subscription.service';
import { WebhookDispatcherService } from './services/webhook-dispatcher.service';
import { ApiKeyRepository } from './repositories/api-key.repository';
import { WebhookSubscriptionRepository } from './repositories/webhook-subscription.repository';
import { ApiKeyAuthGuard } from './guards/api-key-auth.guard';
import { WebhookConsumer } from './consumers/webhook.consumer';
import { BullQueues } from '../../shared/utils/constants';
import { UserModule } from '../user/user.module';
import { ToDoModule } from '../to-do/to-do.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: BullQueues.WEBHOOK,
    }),
    forwardRef(() => UserModule),
    forwardRef(() => ToDoModule),
  ],
  controllers: [ApiKeyController, WebhookSubscriptionController, ExternalApiController],
  providers: [
    ApiKeyService,
    WebhookSubscriptionService,
    WebhookDispatcherService,
    ApiKeyRepository,
    WebhookSubscriptionRepository,
    ApiKeyAuthGuard,
    WebhookConsumer,
  ],
  exports: [WebhookDispatcherService, ApiKeyService],
})
export class WebhookModule {}
