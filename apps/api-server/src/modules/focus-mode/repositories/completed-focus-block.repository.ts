import { Injectable } from '@nestjs/common';
import { Connection } from 'typeorm';
import { BaseRepository } from '../../../shared/repositories/base-repository.repository';
import { CompletedFocusBlock } from '../entities/completed-focus-block.entity';

@Injectable()
export class CompletedFocusBlockRepository extends BaseRepository<CompletedFocusBlock> {
  constructor(private readonly connection: Connection) {
    super(connection, CompletedFocusBlock);
  }
}
