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
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ca_user_start_time_open
      ON completed_activities (user_id, start_time)
      WHERE finish_time IS NULL
    `);

    // completed_focus_blocks (weekly summary)
    await q.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cfb_user_created_at
      ON completed_focus_blocks (user_id, created_at)
    `);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query('DROP INDEX CONCURRENTLY IF EXISTS idx_cfb_user_created_at');
    await q.query('DROP INDEX CONCURRENTLY IF EXISTS idx_ca_user_start_time_open');
    await q.query('DROP INDEX CONCURRENTLY IF EXISTS idx_ca_user_start_time');
    await q.query('DROP INDEX CONCURRENTLY IF EXISTS idx_ca_seq_created');
    await q.query('DROP INDEX CONCURRENTLY IF EXISTS idx_cas_user_start_time');
    await q.query('DROP INDEX CONCURRENTLY IF EXISTS idx_cas_user_current');
    await q.query('DROP INDEX CONCURRENTLY IF EXISTS idx_cas_user_created_at');
  }
}
