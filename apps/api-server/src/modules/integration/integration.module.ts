import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { UserModule } from '../user/user.module';
import { IntegrationController } from './controllers/integration.controller';
import { FocusModeModule } from '../focus-mode/focus-mode.module';
import { ToDoModule } from '../to-do/to-do.module';
import { AuthModule } from '../auth/auth.module';
import { PlatformIntegrationsModule } from '../platform-integrations/platform-integrations.module';
import { IntegrationFactory } from './services/IntegrationFactory';
import { ZohoService } from './services/zoho.service';
import { MondayService } from './services/monday.service';
import { JiraService } from './services/jira.service';
import { AsanaService } from './services/asana.service';
import { ClickUpService } from './services/clickup.service';
import { TrelloService } from './services/trello.service';
import { SyncTasksConsumer } from './consumers/sync-tasks.consumer';
import { BullQueues } from '../../shared/utils/constants';

@Module({
  providers: [
    IntegrationFactory,
    ZohoService,
    MondayService,
    JiraService,
    AsanaService,
    ClickUpService,
    TrelloService,
    SyncTasksConsumer,
  ],
  exports: [IntegrationFactory, ZohoService, MondayService, JiraService, AsanaService, ClickUpService, TrelloService],
  imports: [
    forwardRef(() => UserModule),
    forwardRef(() => FocusModeModule),
    forwardRef(() => ToDoModule),
    forwardRef(() => AuthModule),
    forwardRef(() => PlatformIntegrationsModule),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => config.get('bull'),
    }),
    BullModule.registerQueue({
      name: BullQueues.SYNC_TASKS,
    }),
  ],
  controllers: [IntegrationController],
})
export class IntegrationModule {}
