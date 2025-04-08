import { Injectable } from '@nestjs/common';
import { Between, Connection } from 'typeorm';
import { BaseRepository } from '../../../shared/repositories/base-repository.repository';
import { CompletedActivityStatItem } from '../domain/completed-activity-stat-item.model';
import { CompletedActivitySequence } from '../entities/completed-activity-sequence.entity';

@Injectable()
export class CompletedActivitySequenceRepository extends BaseRepository<CompletedActivitySequence> {
  constructor(private readonly connection: Connection) {
    super(connection, CompletedActivitySequence);
  }

  async getMostRecentCompletedTime(activity_sequence_id: string): Promise<any> {
    return this.orm
      .createQueryBuilder('completed_activity_sequences')
      .select('MAX(completed_activity_sequences.finish_time)', 'last_time')
      .where('completed_activity_sequences.activity_sequence_id = :activity_sequence_id', { activity_sequence_id })
      .execute()
      .then(([{ last_time }]) => last_time);
  }

  async getUncompletedSequenceLog(id: string): Promise<CompletedActivitySequence> {
    return this.orm.findOne({
      where: { id, is_completed: false },
      relations: ['activity_sequence', 'completed_activity_logs'],
    });
  }

  async getSequenceLogByDate(id: string, start_of_day: Date, end_of_day: Date): Promise<CompletedActivitySequence> {
    return this.orm.findOne({
      where: { id, start_time: Between(start_of_day, end_of_day) },
      relations: ['activity_sequence', 'completed_activity_logs'],
    });
  }

  async getAggregatedDurationLogsPerDay(
    activity_sequence_id: string,
    { days_number = 30, timezone = 'UTC' }: any,
  ): Promise<Array<{ average_duration_percent_deviation: string } & CompletedActivityStatItem>> {
    return this.orm.query(
      `
      SELECT 
        date_trunc('day', timezone($3, finish_time)) as date,
        SUM(duration_minutes) as summary,
        AVG(duration_percent_deviation) as average_duration_percent_deviation
      FROM completed_activity_sequences
      WHERE 
        activity_sequence_id = $1
        AND is_completed = true
      GROUP BY date_trunc('day', timezone($3, finish_time))
      ORDER BY date DESC
      LIMIT $2
    `,
      [activity_sequence_id, days_number, timezone],
    );
  }

  async getTodayCompletedSequences(
    startOfDay: Date,
    endOfDay: Date,
    user_id: string,
  ): Promise<CompletedActivitySequence[]> {
    return this.orm
      .createQueryBuilder('completed_activity_sequences')
      .select('id')
      .where('is_completed = true')
      .andWhere('user_id = :user_id', { user_id })
      .andWhere('start_time BETWEEN :startOfDay AND :endOfDay', { startOfDay, endOfDay })
      .orderBy('start_time', 'ASC')
      .getRawMany();
  }

  async getTodaySequences(startOfDay: Date, endOfDay: Date, user_id: string): Promise<CompletedActivitySequence[]> {
    return this.orm
      .createQueryBuilder('completed_activity_sequences')
      .leftJoinAndSelect('completed_activity_sequences.completed_activity_logs', 'completed_activity_logs')
      .leftJoinAndSelect('completed_activity_sequences.activity_sequence', 'activity_sequence')
      .where('completed_activity_sequences.user_id = :user_id', { user_id })
      .andWhere('completed_activity_sequences.start_time BETWEEN :startOfDay AND :endOfDay', { startOfDay, endOfDay })
      .orderBy('completed_activity_sequences.start_time', 'ASC')
      .getMany();
  }
}
