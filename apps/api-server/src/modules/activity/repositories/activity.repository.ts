import { Injectable } from '@nestjs/common';
import { Connection } from 'typeorm';
import { BaseRepository } from '../../../shared/repositories/base-repository.repository';
import { Activity } from '../entities/activity.entity';
import { ActivityType } from '../domain/activity-type.enum';

@Injectable()
export class ActivityRepository extends BaseRepository<Activity> {
  constructor(private readonly connection: Connection) {
    super(connection, Activity);
  }

  async getActivitiesForAdmin(user_id: string, page = 1, routine?: ActivityType) {
    const take = 50;
    const skip = page * take - take;
    const query = this.orm
      .createQueryBuilder('activities')
      .take(take)
      .skip(skip)
      .where('activities.user_id = :user_id', { user_id })
      .andWhere('activities.is_deleted = false');
    if (routine) {
      query.andWhere('activities.type = :activity_type', { activity_type: routine });
    }
    return query.getMany();
  }
}
