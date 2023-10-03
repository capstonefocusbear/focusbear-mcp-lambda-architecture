import { Module, forwardRef } from '@nestjs/common';
import { UserModule } from '../user/user.module';
import { MondayService } from './services/monday.service';
import { MondayController } from './controllers/monday.controller';
import { FocusModeModule } from '../focus-mode/focus-mode.module';
import { ToDoModule } from '../to-do/to-do.module';
import { AuthModule } from '../auth/auth.module';
import { PlatformIntegrationsModule } from '../platform-integrations/platform-integrations.module';

@Module({
  providers: [MondayService],
  exports: [MondayService],
  imports: [UserModule, FocusModeModule, ToDoModule, forwardRef(() => AuthModule), PlatformIntegrationsModule],
  controllers: [MondayController],
})
export class MondayModule {}
