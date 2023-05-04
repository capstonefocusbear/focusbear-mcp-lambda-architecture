import { Injectable } from '@nestjs/common';
import { Connection } from 'typeorm';
import { BaseRepository } from '../../../shared/repositories/base-repository.repository';
import { FocusModeTag } from '../entities/focus-mode-tags';

@Injectable()
export class FocusModeTagRepository extends BaseRepository<FocusModeTag> {
  constructor(private readonly connection: Connection) {
    super(connection, FocusModeTag);
  }
}
