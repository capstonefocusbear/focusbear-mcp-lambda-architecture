import { Module } from '@nestjs/common';
import { UserModule } from '../user/user.module';
import { FocusModeController } from './controllers/focus-mode/focus-mode.controller';
import { CompletedFocusBlockRepository } from './repositories/completed-focus-block.repository';
import { FocusModeRepository } from './repositories/focus-mode.repository';
import { FocusModeService } from './services/focus-mode/focus-mode.service';

@Module({
  providers: [FocusModeService, FocusModeRepository, CompletedFocusBlockRepository],
  imports: [UserModule],
  controllers: [FocusModeController],
})
export class FocusModeModule {}
