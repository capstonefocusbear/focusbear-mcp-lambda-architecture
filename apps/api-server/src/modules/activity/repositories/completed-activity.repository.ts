import { Injectable } from '@nestjs/common';
import { Connection, In, MoreThan } from 'typeorm';
import { BaseRepository } from '../../../shared/repositories/base-repository.repository';
import { CompletedActivityStatItem } from '../domain/completed-activity-stat-item.model';
import { CompletedActivity } from '../entities/completed-activity.entity';

@Injectable()
export class CompletedActivityRepository extends BaseRepository<CompletedActivity> {
  constructor(private readonly connection: Connection) {
    super(connection, CompletedActivity);
  }

  async getAggregatedQuantityLogsPerDay(
    activity_id: string,
    { log_summary_type = 'SUM', days_number = 30, stat_type, timezone = 'UTC' }: any,
  ): Promise<CompletedActivityStatItem[]> {
    return this.orm.query(
      `
      SELECT 
        date_trunc('day', timezone($3, finish_time)) as date,
        ${log_summary_type}(${stat_type}_logged) as summary
      FROM completed_activities
      WHERE activity_id = $1
      GROUP BY date_trunc('day', timezone($3, finish_time))
      ORDER BY date DESC
      LIMIT $2
    `,
      [activity_id, days_number, timezone],
    );
  }

  async getItemsByIds(activity_ids: string[]): Promise<CompletedActivity[]> {
    return this.orm.find({ where: { activity_id: In(activity_ids) } });
  }

  async getTotalDurationsPerTimeRange(activity_ids: string[], { start_time, finish_time }): Promise<string | number> {
    return this.orm
      .createQueryBuilder('completed_activities')
      .select('SUM(completed_activities.duration_logged)', 'total_duration')
      .where('completed_activities.activity_id IN (:...activity_ids)', { activity_ids })
      .andWhere('completed_activities.finish_time BETWEEN :start_time AND :finish_time', { start_time, finish_time })
      .execute()
      .then(([{ total_duration }]) => total_duration);
  }

  async findInSequenceAfterTime(activity_sequence_id: string, timestamp: Date): Promise<CompletedActivity[]> {
    const where = { activity_sequence_id };
    if (timestamp) Object.assign(where, { finish_time: MoreThan(timestamp) });
    return this.orm.find(where);
  }
}
