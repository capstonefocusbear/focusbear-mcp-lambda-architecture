import { Injectable } from '@nestjs/common';
import { BaseCRUDService } from '../../../../shared/services/base-crud.service';
import { FocusMode } from '../../entities/focus-mode.entity';
import { FocusModeRepository } from '../../repositories/focus-mode.repository';

@Injectable()
export class FocusModeService extends BaseCRUDService<FocusModeRepository, FocusMode> {
  constructor(private readonly repo: FocusModeRepository) {
    super(repo);
  }
}
