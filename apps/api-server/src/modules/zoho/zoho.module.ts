import { Module, forwardRef } from '@nestjs/common';
import { UserModule } from '../user/user.module';
import { ZohoService } from './services/zoho.service';
import { ZohoController } from './controllers/zoho.controller';
import { FocusModeModule } from '../focus-mode/focus-mode.module';
import { ToDoModule } from '../to-do/to-do.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  providers: [ZohoService],
  exports: [ZohoService],
  imports: [UserModule, FocusModeModule, ToDoModule, forwardRef(() => AuthModule)],
  controllers: [ZohoController],
})
export class ZohoModule {}
