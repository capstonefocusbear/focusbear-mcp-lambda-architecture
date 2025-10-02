import { MigrationInterface, QueryRunner } from 'typeorm';

export class UserEndpointIndexing1759217602679 implements MigrationInterface {
  public transaction = false;

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cas_user_localday
      ON completed_activity_sequences (user_id, local_day)
    `);

    await q.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cas_user_localday_current
      ON completed_activity_sequences (user_id, local_day)
      WHERE status = 'current'
    `);

    await q.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ca_seqlog_created
      ON completed_activities (completing_sequence_log_id, created_at)
    `);

    await q.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ca_user_start_time
      ON completed_activities (user_id, start_time)
    `);

    await q.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_device_settings_user_device
      ON device_settings (user_id, device_id)
    `);

    await q.query(`
      CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_user_settings_user
      ON user_settings (user_id)
    `);

    await q.query(`
      CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_subscription_user
      ON subscriptions (user_id)
    `);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query('DROP INDEX CONCURRENTLY IF EXISTS idx_subscription_user');
    await q.query('DROP INDEX CONCURRENTLY IF EXISTS idx_user_settings_user');
    await q.query('DROP INDEX CONCURRENTLY IF EXISTS idx_device_settings_user_device');
    await q.query('DROP INDEX CONCURRENTLY IF EXISTS idx_ca_user_start_time');
    await q.query('DROP INDEX CONCURRENTLY IF EXISTS idx_ca_seqlog_created');
    await q.query('DROP INDEX CONCURRENTLY IF EXISTS idx_cas_user_localday_current');
    await q.query('DROP INDEX CONCURRENTLY IF EXISTS idx_cas_user_localday');
  }
}
