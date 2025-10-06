import { MigrationInterface, QueryRunner } from 'typeorm';

export class UserEndpointIndexing1759217602679 implements MigrationInterface {
  public transaction = false;

  public async up(q: QueryRunner): Promise<void> {
    // completed_activity_sequences
    await q.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cas_user_created_at
      ON completed_activity_sequences (user_id, created_at)
    `);

    await q.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cas_user_current
      ON completed_activity_sequences (user_id)
      WHERE is_completed = false
    `);

    // speed up queries that use start_time
    await q.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cas_user_start_time
      ON completed_activity_sequences (user_id, start_time)
    `);

    // completed_activities
    await q.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ca_seq_created
      ON completed_activities (activity_sequence_id, created_at)
    `);

    await q.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ca_user_start_time
      ON completed_activities (user_id, start_time)
    `);

    // faster “in-progress” activity lookup
    await q.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ca_user_finish_time_null
      ON completed_activities (user_id)
      WHERE finish_time IS NULL
    `);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query('DROP INDEX CONCURRENTLY IF EXISTS idx_ca_user_start_time');
    await q.query('DROP INDEX CONCURRENTLY IF EXISTS idx_ca_user_finish_time_null');
    await q.query('DROP INDEX CONCURRENTLY IF EXISTS idx_ca_seq_created');
    await q.query('DROP INDEX CONCURRENTLY IF EXISTS idx_cas_user_start_time');
    await q.query('DROP INDEX CONCURRENTLY IF EXISTS idx_cas_user_current');
    await q.query('DROP INDEX CONCURRENTLY IF EXISTS idx_cas_user_created_at');
  }
}
