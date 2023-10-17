import { Module } from '@nestjs/common';
import { AiService } from './services/ai.service';
import { AiController } from './controllers/ai.controller';
import { UserModule } from '../user/user.module';
import { FocusModeModule } from '../focus-mode/focus-mode.module';

@Module({
  providers: [AiService],
  exports: [],
  imports: [UserModule, FocusModeModule],
  controllers: [AiController],
})
export class AiModule {}
