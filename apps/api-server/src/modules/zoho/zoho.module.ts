import { Module, forwardRef } from '@nestjs/common';
import { UserModule } from '../user/user.module';
import { ZohoService } from './services/zoho.service';
import { ZohoController } from './controllers/zoho.controller';
import { FocusModeModule } from '../focus-mode/focus-mode.module';
import { ToDoModule } from '../to-do/to-do.module';
import { AuthModule } from '../auth/auth.module';
import { PlatformIntegrationsModule } from '../platform-integrations/platform-integrations.module';

@Module({
  providers: [ZohoService],
  exports: [ZohoService],
  imports: [UserModule, FocusModeModule, ToDoModule, forwardRef(() => AuthModule), PlatformIntegrationsModule],
  controllers: [ZohoController],
})
export class ZohoModule {}
