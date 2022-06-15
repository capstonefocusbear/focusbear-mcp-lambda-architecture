import { Injectable } from '@nestjs/common';
import { Connection, Not, In, Transaction, TransactionManager, EntityManager } from 'typeorm';
import { createBaseRepository } from '../../../shared/repositories/base-repository.repository';
import { ActivitySequence } from '../../activity/entities/activity-sequence.entity';
import { Activity } from '../../activity/entities/activity.entity';
import { DeserializedActivity } from '../../activity/services/activity-parser/activity-parser.service';
import { User } from '../entities/user.entity';

@Injectable()
export class UserRepository extends createBaseRepository<User>(User) {
  constructor(private readonly connection: Connection) {
    super(connection);
  }

  @Transaction({ isolation: 'SERIALIZABLE' })
  async consistentlyUpdateUserSettings(
    { id, ...updateData }: User,
    activitiesData?: DeserializedActivity[],
    @TransactionManager() manager?: EntityManager,
  ) {
    await manager.update(User, { id }, { ...updateData });
    await Promise.all(
      activitiesData.map(async ({ sequence, activities }) => {
        const { identifiers } = await manager.upsert(ActivitySequence, sequence, ['type', 'user_id']);
        await manager.delete(Activity, { activity_sequence_id: identifiers[0].id, id: Not(In(sequence.activity_ids)) });
        await manager.upsert(Activity, activities, ['id']);
      }),
    );
  }

  async getUserSettings(id: string): Promise<User> {
    return this.orm
      .createQueryBuilder('users')
      .leftJoinAndSelect('users.activity_sequences', 'activity_sequences')
      .leftJoinAndSelect('activity_sequences.activities', 'activities')
      .select([
        'users.id',
        'users.startup_time',
        'users.shutdown_time',
        'users.break_after_minutes',
        'activities.id',
        'activities.log_quantity',
        'activities.duration_seconds',
        'activities.log_summary_type',
        'activities.activity_type',
        'activities.activity_data',
        'activity_sequences.type',
        'activity_sequences.id',
        'activity_sequences.activity_ids',
      ])
      .where('users.id = :id', { id })
      .getOne();
  }
}
