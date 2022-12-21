import { Injectable } from '@nestjs/common';
import { Connection } from 'typeorm';
import { BaseRepository } from '../../../shared/repositories/base-repository.repository';
import { InstalledFocusModeTemplate } from '../entities/installed-focus-mode_templates.entity';

@Injectable()
export class InstalledFocusModeTemplatesRepository extends BaseRepository<InstalledFocusModeTemplate> {
  constructor(private readonly connection: Connection) {
    super(connection, InstalledFocusModeTemplate);
  }
}
