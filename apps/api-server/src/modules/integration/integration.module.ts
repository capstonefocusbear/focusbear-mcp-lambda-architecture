import { Module, forwardRef } from '@nestjs/common';
import { UserModule } from '../user/user.module';
import { IntegrationController } from './controllers/integration.controller';
import { FocusModeModule } from '../focus-mode/focus-mode.module';
import { ToDoModule } from '../to-do/to-do.module';
import { AuthModule } from '../auth/auth.module';
import { PlatformIntegrationsModule } from '../platform-integrations/platform-integrations.module';
import { IntegrationFactory } from '../integration/services/IntegrationFactory';
import { ZohoService } from './services/zoho.service';
import { MondayService } from './services/monday.service';

@Module({
  providers: [IntegrationFactory, ZohoService, MondayService],
  exports: [IntegrationFactory, ZohoService, MondayService],
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
