import { Injectable } from '@nestjs/common';
import { Connection } from 'typeorm';
import { createBaseRepository } from '../../../shared/repositories/base-repository.repository';
import { ActivitySequence } from '../entities/activity-sequence.entity';

@Injectable()
export class ActivitySequenceRepository extends createBaseRepository<ActivitySequence>(ActivitySequence) {
  constructor(private readonly connection: Connection) {
    super(connection);
  }

  async findOneByTypeForUser(type: string, user_id: string): Promise<ActivitySequence> {
    return this.orm.findOne({ where: { type, user_id } });
  }
}
