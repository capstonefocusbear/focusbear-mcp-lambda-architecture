import { Injectable } from '@nestjs/common';
import { Connection } from 'typeorm';
import { createBaseRepository } from '../../../shared/repositories/base-repository.repository';
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
}
