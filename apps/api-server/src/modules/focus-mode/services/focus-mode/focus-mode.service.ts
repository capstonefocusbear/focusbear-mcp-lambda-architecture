import { Injectable } from '@nestjs/common';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { BaseCRUDService } from '../../../../shared/services/base-crud.service';
import { FocusMode } from '../../entities/focus-mode.entity';
import { FocusModeRepository } from '../../repositories/focus-mode.repository';

@Injectable()
export class FocusModeService extends BaseCRUDService<FocusModeRepository, FocusMode> {
  constructor(
    private readonly repo: FocusModeRepository,
    private readonly focusModeRepository: FocusModeRepository,
    @InjectSentry() private readonly sentryService: SentryService,
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

  async updateFocusModes(user_id: string, focusModes: FocusMode[]): Promise<FocusMode[]> {
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
}
