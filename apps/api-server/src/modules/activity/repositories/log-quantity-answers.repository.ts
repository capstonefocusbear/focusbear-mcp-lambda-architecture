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
    questionIds: string[],
    { log_summary_type = 'SUM', days_number = 30, timezone = 'UTC' }: any,
  ): Promise<CompletedActivityStatItem[]> {
    const query = this.orm
      .createQueryBuilder('log_quantity_answers')
      .select("date_trunc('day', timezone(:timezone, log_quantity_answers.date_logged))", 'date')
      .addSelect(`${log_summary_type}(log_quantity_answers.logged_value)`, 'summary')
      .where('log_quantity_answers.question_id IN (:...questionIds)')
      .groupBy('date')
      .orderBy('date', 'DESC')
      .limit(days_number)
      .setParameters({ questionIds, days_number, timezone });

    return query.getRawMany();
  }
}
