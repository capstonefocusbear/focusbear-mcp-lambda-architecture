import { Module, forwardRef } from '@nestjs/common';
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
import { ClickupService } from './services/clickup.service';
import { TrelloService } from './services/trello.service';

@Module({
  providers: [IntegrationFactory, ZohoService, MondayService, JiraService, AsanaService, ClickupService, TrelloService],
  exports: [IntegrationFactory, ZohoService, MondayService, JiraService, AsanaService, ClickupService, TrelloService],
  imports: [
    forwardRef(() => UserModule),
    forwardRef(() => FocusModeModule),
    forwardRef(() => ToDoModule),
    forwardRef(() => AuthModule),
    forwardRef(() => PlatformIntegrationsModule),
  ],
  controllers: [IntegrationController],
})
export class IntegrationModule {}
