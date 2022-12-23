import { Injectable } from '@nestjs/common';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { BaseCRUDService } from '../../../../shared/services/base-crud.service';
import { InstalledFocusModeTemplatesRepository } from '../../../focus-mode-template/repositories/installed-focus-mode-templates.reporisoty';
import { UpdateFocusModeDto } from '../../dto/update-focus-mode.dto';
import { FocusMode } from '../../entities/focus-mode.entity';
import { FocusModeRepository } from '../../repositories/focus-mode.repository';

@Injectable()
export class FocusModeService extends BaseCRUDService<FocusModeRepository, FocusMode> {
  constructor(
    private readonly repo: FocusModeRepository,
    private readonly focusModeRepository: FocusModeRepository,
    @InjectSentry() private readonly sentryService: SentryService,
    private readonly installedFocusModeTeplatesRepository: InstalledFocusModeTemplatesRepository,
  ) {
    super(repo);
  }

  async fetchUserFocusModes(user_id: string): Promise<FocusMode[]> {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Fetching user focus modes',
        data: {
          user_id,
        },
      });
      const focusModes = await this.focusModeRepository.orm.find({ where: { user_id } });
      return focusModes;
    } catch (error) {
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
      throw error;
    }
  }

  async updateFocusModes(user_id: string, focusModes: UpdateFocusModeDto[]): Promise<FocusMode[]> {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Updating user focus modes',
        data: {
          user_id,
        },
      });
      await Promise.all(
        focusModes.map(async (focusMode) => {
          await this.focusModeRepository.update(focusMode.id, { ...focusMode });
        }),
      );
      return await this.fetchUserFocusModes(user_id);
    } catch (error) {
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
      throw error;
    }
  }

  async deleteFocusMode(id: string) {
    const focusMode = await this.focusModeRepository.orm.findOneBy({ id });
    // if focus mode is from an installed focus mode template, mark as uninstalled
    if (focusMode?.focus_mode_template_id) {
      const { user_id, focus_mode_template_id } = focusMode;
      const installedRecord = await this.installedFocusModeTeplatesRepository.orm.findOne({
        where: { user_id, focus_mode_template_id, installation_status: true },
      });
      this.installedFocusModeTeplatesRepository.orm.update(installedRecord.id, { installation_status: false });
    }
    this.focusModeRepository.orm.softDelete(id);
  }
}
