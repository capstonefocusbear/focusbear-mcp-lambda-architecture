import { Injectable } from '@nestjs/common';
import { Connection } from 'typeorm';
import { createBaseRepository } from '../../../shared/repositories/base-repository.repository';
import { CompletedFocusBlock } from '../entities/completed-focus-block.entity';

@Injectable()
export class CompletedFocusBlockRepository extends createBaseRepository<CompletedFocusBlock>(CompletedFocusBlock) {
  constructor(private readonly connection: Connection) {
    super(connection);
  }
}
