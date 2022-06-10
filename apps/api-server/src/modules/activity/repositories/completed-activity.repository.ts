import { Injectable } from '@nestjs/common';
import { Connection } from 'typeorm';
import { createBaseRepository } from '../../../shared/repositories/base-repository.repository';
import { CompletedActivity } from '../entities/completed-activity.entity';

@Injectable()
export class CompletedActivityRepository extends createBaseRepository<CompletedActivity>(CompletedActivity) {
  constructor(private readonly connection: Connection) {
    super(connection);
  }
}
