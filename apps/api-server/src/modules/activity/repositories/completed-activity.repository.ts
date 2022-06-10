import { Injectable } from '@nestjs/common';
import { Connection } from 'typeorm';
import { createBaseRepository } from '../../../shared/repositories/base-repository.repository';
import { CompletedActivity } from '../entities/completed-activity.entity';

@Injectable()
export class CompletedActivityRepository extends createBaseRepository<CompletedActivity>(CompletedActivity) {
  constructor(private readonly connection: Connection) {
    super(connection);
  }

  async getAggregatedQuantityLogsPerDay(
    activity_id: string,
    { log_quantity_summary_type = 'SUM', days_number = 30 }: any,
  ) {
    return this.orm.query(
      `
      SELECT 
        date_trunc('day', timestamp) as date,
        ${log_quantity_summary_type}(quantity_logged) as summary
      FROM completed_activities
      WHERE activity_id = $1
      GROUP BY date_trunc('day', timestamp)
      ORDER BY date ASC
      LIMIT $2
    `,
      [activity_id, days_number],
    );
  }
}
