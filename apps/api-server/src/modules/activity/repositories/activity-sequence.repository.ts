import { Injectable } from '@nestjs/common';
import { Connection } from 'typeorm';
import { BaseRepository } from '../../../shared/repositories/base-repository.repository';
import { ActivitySequence } from '../entities/activity-sequence.entity';

@Injectable()
export class ActivitySequenceRepository extends BaseRepository<ActivitySequence> {
  constructor(private readonly connection: Connection) {
    super(connection, ActivitySequence);
  }

  async findOneByTypeForUser(type: string, user_id: string): Promise<ActivitySequence> {
    return this.orm.findOne({ where: { type, user_id } });
  }

  async findOneByIdForUser(id: string, user_id: string): Promise<ActivitySequence> {
    return this.orm.findOne({ where: { id, user_id } });
  }
}
