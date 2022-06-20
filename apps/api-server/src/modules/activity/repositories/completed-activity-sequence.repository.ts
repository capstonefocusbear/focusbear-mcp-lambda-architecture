import { Injectable } from '@nestjs/common';
import { Connection } from 'typeorm';
import { createBaseRepository } from '../../../shared/repositories/base-repository.repository';
import { CompletedActivityStatItem } from '../domain/completed-activity-stat-item.model';
import { CompletedActivitySequence } from '../entities/completed-activity-sequence.entity';

@Injectable()
export class CompletedActivitySequenceRepository extends createBaseRepository<CompletedActivitySequence>(
  CompletedActivitySequence,
) {
  constructor(private readonly connection: Connection) {
    super(connection);
  }

  async getMostRecentCompletedTime(activity_sequence_id: string): Promise<any> {
    return this.orm
      .createQueryBuilder('completed_activity_sequences')
      .select('MAX(completed_activity_sequences.finish_time)', 'last_time')
      .where('completed_activity_sequences.activity_sequence_id = :activity_sequence_id', { activity_sequence_id })
      .execute()
      .then(([{ last_time }]) => last_time);
  }

  async getAggregatedDurationLogsPerDay(
    activity_sequence_id: string,
    { days_number = 30 }: any,
  ): Promise<CompletedActivityStatItem[]> {
    return this.orm.query(
      `
      SELECT 
        date_trunc('day', finish_time) as date,
        SUM(duration_minutes) as summary
      FROM completed_activity_sequences
      WHERE activity_sequence_id = $1
      GROUP BY date_trunc('day', finish_time)
      ORDER BY date DESC
      LIMIT $2
    `,
      [activity_sequence_id, days_number],
    );
  }
}
