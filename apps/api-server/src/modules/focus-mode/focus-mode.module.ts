import { Module } from '@nestjs/common';
import { UserModule } from '../user/user.module';
import { FocusModeController } from './controllers/focus-mode/focus-mode.controller';
import { CompletedFocusBlockRepository } from './repositories/completed-focus-block.repository';
import { FocusModeRepository } from './repositories/focus-mode.repository';
import { FocusModeManagerService } from './services/focus-mode-manager/focus-mode-manager.service';
import { FocusModeService } from './services/focus-mode/focus-mode.service';

@Module({
  providers: [FocusModeService, FocusModeRepository, CompletedFocusBlockRepository, FocusModeManagerService],
  imports: [UserModule],
  controllers: [FocusModeController],
})
export class FocusModeModule {}
