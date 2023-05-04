import { Injectable } from '@nestjs/common';
import { DateTime } from 'luxon';
import { Between, Connection, In, MoreThan } from 'typeorm';
import { BaseRepository } from '../../../shared/repositories/base-repository.repository';
import { ActivityType } from '../domain/activity-type.enum';
import { CompletedActivityStatItem } from '../domain/completed-activity-stat-item.model';
import { LogSummaryType } from '../domain/log-summary-type.enum';
import { CompletedActivity } from '../entities/completed-activity.entity';
import { CURRENT_TIME, TWENTY_FOUR_HOURS_AGO } from '../../../shared/utils/constatnts';

@Injectable()
export class CompletedActivityRepository extends BaseRepository<CompletedActivity> {
  constructor(private readonly connection: Connection) {
    super(connection, CompletedActivity);
  }

  async getAggregatedQuantityLogsPerDay(
    activityIds: string[],
    { log_summary_type = 'SUM', days_number = 30, stat_type, timezone = 'UTC' }: any,
  ): Promise<CompletedActivityStatItem[]> {
    const query = this.orm
      .createQueryBuilder('completed_activities')
      .select("date_trunc('day', timezone(:timezone, completed_activities.finish_time))", 'date')
      .addSelect(`${log_summary_type}(completed_activities.${stat_type}_logged)`, 'summary')
      .where('completed_activities.activity_id IN (:...activityIds)')
      .groupBy('date')
      .orderBy('date', 'DESC')
      .limit(days_number)
      .setParameters({ activityIds, days_number, timezone });

    const completedActivities: { date: string; summary: string }[] = await query.getRawMany();
    return completedActivities.filter((activity) => activity.date);
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
    return this.orm.find({ where });
  }

  async getLogsByActivityInTimeRange(
    activity_id: string,
    { from_time = TWENTY_FOUR_HOURS_AGO, to_time = CURRENT_TIME },
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

  async getDaySummarySUM(user_id: string, { from_time = TWENTY_FOUR_HOURS_AGO, to_time = CURRENT_TIME }): Promise<any> {
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
    { from_time = TWENTY_FOUR_HOURS_AGO, to_time = CURRENT_TIME },
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

  async getDaySummaryDuration(
    user_id: string,
    { from_time = TWENTY_FOUR_HOURS_AGO, to_time = CURRENT_TIME },
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

  async getWeekSummary(user_id: string): Promise<CompletedActivity[]> {
    const currentTime = DateTime.local();
    const end_date = currentTime;
    const start_date = currentTime.minus({ days: 6 });
    return this.orm.find({
      select: ['finish_time', 'quantity_logged'],
      where: {
        user_id,
        finish_time: Between(start_date.toJSDate(), end_date.toJSDate()),
      },
    });
  }

  async getNotes(user_id: string, activityId: string, fromDate: Date, toDate: Date, page_num = 1, per_page = 50) {
    const recordsToSkip = page_num * per_page - per_page;
    const query = this.orm
      .createQueryBuilder('completed_activities')
      .orderBy('completed_activities.start_time', 'DESC')
      .leftJoinAndSelect('completed_activities.activity', 'activity')
      .select([
        'completed_activities.id',
        'completed_activities.activity_note',
        'completed_activities.start_time',
        'activity.activity_data',
      ])
      .where('completed_activities.user_id = :user_id', { user_id })
      .andWhere('completed_activities.activity_note IS NOT NULL');

    if (activityId) {
      query.andWhere('completed_activities.activity_id = :activity_id', { activity_id: activityId });
    }
    if (fromDate && toDate) {
      query.andWhere('completed_activities.start_time > :from_date', { from_date: fromDate });
      query.andWhere('completed_activities.start_time < :to_date', { to_date: toDate });
    }
    return query.take(per_page).skip(recordsToSkip).getMany();
  }
}
