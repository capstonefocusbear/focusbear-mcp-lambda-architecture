import { forwardRef, Module } from '@nestjs/common';
import { FocusModeModule } from '../focus-mode/focus-mode.module';
import { UserModule } from '../user/user.module';
import { FocusModeTemplatesController } from './controllers/focus-mode-template.controller';
import { FocusModeTemplatesRepository } from './repositories/focus-mode-templates.repository';
import { InstalledFocusModeTemplatesRepository } from './repositories/installed-focus-mode-templates.reporisoty';
import { FocusModeTemplatesService } from './services/focus-mode-templates.service';

@Module({
  providers: [FocusModeTemplatesRepository, InstalledFocusModeTemplatesRepository, FocusModeTemplatesService],
  exports: [FocusModeTemplatesRepository, InstalledFocusModeTemplatesRepository],
  imports: [forwardRef(() => UserModule), FocusModeModule],
  controllers: [FocusModeTemplatesController],
})
export class FocusModeTemplatesModule {}
