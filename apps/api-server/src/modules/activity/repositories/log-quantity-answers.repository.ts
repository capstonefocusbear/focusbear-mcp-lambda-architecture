import { Injectable } from '@nestjs/common';
import { Connection } from 'typeorm';
import { BaseRepository } from '../../../shared/repositories/base-repository.repository';
import { LogQuantityAnswer } from '../entities/log-quantity-answers';
import { CompletedActivityStatItem } from '../domain/completed-activity-stat-item.model';

@Injectable()
export class LogQuantityAnswersRepository extends BaseRepository<LogQuantityAnswer> {
  constructor(private readonly connection: Connection) {
    super(connection, LogQuantityAnswer);
  }

  async getAggregatedQuantityLogsPerDay(
    question_id: string,
    { log_summary_type = 'SUM', days_number = 30, timezone = 'UTC' }: any,
  ): Promise<CompletedActivityStatItem[]> {
    return this.orm.query(
      `
      SELECT 
        date_trunc('day', timezone($3, date_logged)) as date,
        ROUND(${log_summary_type}(logged_value), 2) as summary
      FROM log_quantity_answers
      WHERE question_id = $1
      GROUP BY date_trunc('day', timezone($3, date_logged))
      ORDER BY date DESC
      LIMIT $2
    `,
      [question_id, days_number, timezone],
    );
  }
}
