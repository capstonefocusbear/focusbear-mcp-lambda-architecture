import { Injectable } from '@nestjs/common';
import { BaseCRUDService } from '../../../../shared/services/base-crud.service';
import { FocusMode } from '../../entities/focus-mode.entity';
import { FocusModeRepository } from '../../repositories/focus-mode.repository';

@Injectable()
export class FocusModeService extends BaseCRUDService<FocusModeRepository, FocusMode> {
  constructor(private readonly repo: FocusModeRepository, private readonly focusModeRepository: FocusModeRepository) {
    super(repo);
  }

  async fetchUserFocusModes(user_id: string): Promise<FocusMode[]> {
    const focusModes = await this.focusModeRepository.orm.find({ where: { user_id } });
    return focusModes;
  }

  async updateFocusModes(user_id: string, focusModes: FocusMode[]): Promise<FocusMode[]> {
    await Promise.all(
      focusModes.map(async (focusMode) => {
        await this.focusModeRepository.update(focusMode.id, { ...focusMode });
      }),
    );
    return this.fetchUserFocusModes(user_id);
  }
}
