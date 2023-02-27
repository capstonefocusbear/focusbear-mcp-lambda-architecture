import { Injectable } from '@nestjs/common';
import { Connection, In, Not } from 'typeorm';
import { AppDataSource } from '../../../../ormconfig';
import { BaseRepository } from '../../../shared/repositories/base-repository.repository';
import { ActivitySequence } from '../../activity/entities/activity-sequence.entity';
import { Activity } from '../../activity/entities/activity.entity';
import { DeserializedActivity } from '../../activity/services/activity-parser/activity-parser.service';
import { GetUsersQueryDto } from '../dto/get-users-query.dto';
import { User } from '../entities/user.entity';

@Injectable()
export class UserRepository extends BaseRepository<User> {
  constructor(private readonly connection: Connection) {
    super(connection, User);
  }

  async consistentlyUpdateUserSettings({ id, ...updateData }: User, activitiesData?: DeserializedActivity[]) {
    await AppDataSource.manager.transaction('SERIALIZABLE', async (transactionalEntityManager) => {
      await transactionalEntityManager.update(User, { id }, { ...updateData });
      await Promise.all(
        activitiesData.map(async ({ sequence, activities }) => {
          await transactionalEntityManager.upsert(ActivitySequence, sequence, ['id']);
          const activityIdsToKeep = activities.map((activity) => activity.id);
          await transactionalEntityManager.delete(Activity, {
            user_id: id,
            id: Not(In(activityIdsToKeep)),
            type: sequence.type,
          });
          const parents = activities.filter(({ parent_id }) => !parent_id);
          const choices = activities.filter(({ parent_id }) => !!parent_id);
          await transactionalEntityManager.upsert(Activity, parents, ['id']);
          await transactionalEntityManager.upsert(Activity, choices, ['id']);
        }),
      );
    });
  }

  async getUserSettings(id: string): Promise<User> {
    return this.orm
      .createQueryBuilder('users')
      .leftJoinAndSelect('users.activity_sequences', 'activity_sequences', 'activity_sequences.type != :standalone', {
        standalone: 'standalone',
      })
      .leftJoinAndSelect('activity_sequences.activities', 'activities', 'activities.activity_type != :standalone', {
        standalone: 'standalone',
      })
      .leftJoinAndSelect('activities.choices', 'choices')
      .select([
        'users.startup_time',
        'users.shutdown_time',
        'users.cutoff_time_for_non_high_priority_activities',
        'users.break_after_minutes',
        'users.has_edited_settings',
        'activities.id',
        'activities.log_quantity',
        'activities.duration_seconds',
        'activities.log_summary_type',
        'activities.activity_type',
        'activities.activity_data',
        'activities.activity_sequence_id',
        'activities.activity_template_id',
        'activities.is_default',
        'activities.run_micro_breaks',
        'activities.days_of_week',
        'choices.id',
        'choices.log_quantity',
        'choices.duration_seconds',
        'choices.log_summary_type',
        'choices.activity_type',
        'choices.activity_data',
        'activity_sequences.type',
        'activity_sequences.id',
        'activity_sequences.activity_ids',
      ])
      .where('users.id = :id', { id })
      .getOne();
  }

  async getUserDetails(id: string): Promise<User> {
    return this.orm
      .createQueryBuilder('users')
      .leftJoinAndSelect('users.devices', 'devices')
      .leftJoinAndSelect('users.focus_modes', 'focus_modes')
      .where('users.id = :id', { id })
      .getOne();
  }

  async getUserCurrentActivityProps(id: string): Promise<Partial<User>> {
    return this.orm
      .createQueryBuilder('users')
      .leftJoinAndSelect('users.current_activity', 'current_activity')
      .leftJoinAndSelect('users.current_focus_mode', 'current_focus_mode')
      .leftJoinAndSelect('users.last_completed_sequence', 'last_completed_sequence')
      .leftJoinAndSelect('users.current_activity_sequence', 'current_activity_sequence')
      .select([
        'users.current_activity_assigned_at',
        'users.current_focus_mode_finish_time',
        'users.last_completed_sequence_started_at',
        'users.id',
        'users.last_completed_sequence_at',
        'users.current_sequence_skipped_activities',
        'users.timezone',
        'users.current_activity_id',
        'users.current_activity_sequence_id',
        'users.cutoff_time_for_non_high_priority_activities',
        'users.current_completing_sequence_log_id',
        'current_activity',
        'current_activity_sequence',
        'last_completed_sequence',
        'current_focus_mode',
      ])
      .where('users.id = :id', { id })
      .getOne();
  }

  async getUsersList({ search }: GetUsersQueryDto): Promise<User[]> {
    return this.orm
      .createQueryBuilder('users')
      .select([
        'users.id',
        'users.email',
        'users.name',
        'users.member_of_team_id',
        'users.owner_of_team_id',
        'users.created_at',
        'users.updated_at',
      ])
      .where('users.email ILIKE :search', { search })
      .getMany();
  }

  async getUserForAdmin(id: string, stripe_customer_id: string) {
    return this.orm.findOne({
      where: [{ id, completed_activity_sequences: { is_completed: true } }, { stripe_customer_id }],
      relations: ['focus_modes', 'activities', 'completed_focus_blocks', 'completed_activity_sequences'],
      order: { completed_focus_blocks: { start_time: 'DESC' }, completed_activity_sequences: { start_time: 'DESC' } },
    });
  }
}
