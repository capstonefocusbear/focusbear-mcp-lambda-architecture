import { Injectable } from '@nestjs/common';
import { Connection } from 'typeorm';
import { BaseRepository } from '../../../shared/repositories/base-repository.repository';
import { ActivityType } from '../domain/activity-type.enum';
import { ActivitySequence } from '../entities/activity-sequence.entity';

@Injectable()
export class ActivitySequenceRepository extends BaseRepository<ActivitySequence> {
  constructor(private readonly connection: Connection) {
    super(connection, ActivitySequence);
  }

  async findOneByTypeForUser(type: ActivityType, user_id: string): Promise<ActivitySequence> {
    return this.orm.findOne({ where: { type, user_id } });
  }

  async findOneByIdForUser(id: string, user_id: string): Promise<ActivitySequence> {
    return this.orm.findOne({ where: { id, user_id } });
  }

  async countSequenceTotalDuration(activity_ids: string[]): Promise<number> {
    return this.orm
      .query(
        `
      SELECT SUM(duration_seconds) as total
      FROM "activities"
      WHERE id = ANY($1::uuid[])
      `,
        [activity_ids],
      )
      .then(([{ total }]) => Number(total));
  }

  async findOneByTypeAndCustomRoutineForUser(
    type: ActivityType,
    user_id: string,
    custom_routine_id: string,
  ): Promise<ActivitySequence> {
    return this.orm.findOne({ where: { type, user_id, custom_routine_id } });
  }
}
