import { Injectable } from '@nestjs/common';
import { Connection } from 'typeorm';
import { BaseRepository } from '../../../shared/repositories/base-repository.repository';
import { FocusMode } from '../entities/focus-mode.entity';

@Injectable()
export class FocusModeRepository extends BaseRepository<FocusMode> {
  constructor(private readonly connection: Connection) {
    super(connection, FocusMode);
  }

  async findOneByIdForUser(id: string, user_id: string): Promise<FocusMode> {
    return this.orm.findOne({ where: { id, user_id } });
  }
}
