import { Injectable } from '@nestjs/common';
import { Connection } from 'typeorm';
import { createBaseRepository } from '../../../shared/repositories/base-repository.repository';
import { CompletedActivitySequence } from '../entities/completed-activity-sequence.entity';

@Injectable()
export class CompletedActivitySequenceRepository extends createBaseRepository<CompletedActivitySequence>(
  CompletedActivitySequence,
) {
  constructor(private readonly connection: Connection) {
    super(connection);
  }
}
