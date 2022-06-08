import { Injectable } from '@nestjs/common';
import { Connection } from 'typeorm';
import { createBaseRepository } from '../../../shared/repositories/base-repository.repository';
import { ComplitedActivity } from '../entities/complited-activity.entity';

@Injectable()
export class ComplitedActivityRepository extends createBaseRepository<ComplitedActivity>(ComplitedActivity) {
  constructor(private readonly connection: Connection) {
    super(connection);
  }
}
