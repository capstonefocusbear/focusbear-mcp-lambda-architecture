import { Injectable } from '@nestjs/common';
import { DateTime } from 'luxon';
import { Between, Connection, In, MoreThan } from 'typeorm';
import { BaseRepository } from '../../../shared/repositories/base-repository.repository';
import { ActivityType } from '../domain/activity-type.enum';
import { CompletedActivityStatItem } from '../domain/completed-activity-stat-item.model';
import { LogSummaryType } from '../domain/log-summary-type.enum';
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

  async getLogsByActivityInTimeRange(
    activity_id: string,
    { from_time = new Date(Date.now() - 24 * 60 * 60 * 1000), to_time = new Date() },
  ): Promise<CompletedActivity[]> {
    return this.orm.find({
      where: {
        activity_id,
        finish_time: Between(from_time, to_time),
      },
      order: {
        start_time: 'DESC',
      },
    });
  }

  async getDaySummarySUM(
    user_id: string,
    { from_time = new Date(Date.now() - 24 * 60 * 60 * 1000), to_time = new Date() },
  ): Promise<any> {
    return this.orm.find({
      where: {
        user_id,
        finish_time: Between(from_time, to_time),
        activity: {
          log_quantity: true,
          type: ActivityType.break,
          log_summary_type: LogSummaryType.SUM,
        },
      },
      relations: ['activity'],
      order: {
        start_time: 'DESC',
      },
    });
  }

  async getDaySummaryAVG(
    user_id: string,
    { from_time = new Date(Date.now() - 24 * 60 * 60 * 1000), to_time = new Date() },
  ): Promise<any[]> {
    return this.orm.find({
      where: {
        user_id,
        finish_time: Between(from_time, to_time),
        activity: {
          log_quantity: true,
          type: ActivityType.break,
          log_summary_type: LogSummaryType.AVERAGE,
        },
      },
      relations: ['activity'],
      order: {
        start_time: 'DESC',
      },
    });
  }

  async getWeekSummary(user_id: string): Promise<CompletedActivity[]> {
    const currentTime = DateTime.local();
    const end_date = currentTime;
    const start_date = currentTime.minus({ days: 6 });
    return this.orm.find({
      relations: ['activity'],
      select: ['finish_time', 'quantity_logged'],
      where: {
        user_id,
        created_at: Between(start_date, end_date),
        activity: {
          log_quantity: true,
        },
      },
    });
  }

  async getDaySummaryDuration(
    user_id: string,
    { from_time = new Date(Date.now() - 24 * 60 * 60 * 1000), to_time = new Date() },
  ): Promise<any> {
    return this.orm.find({
      where: {
        user_id,
        finish_time: Between(from_time, to_time),
        activity: {
          has_choices: In([false, null]),
          log_quantity: false,
          type: ActivityType.break,
        },
      },
      relations: ['activity'],
      order: {
        start_time: 'DESC',
      },
    });
  }
}
