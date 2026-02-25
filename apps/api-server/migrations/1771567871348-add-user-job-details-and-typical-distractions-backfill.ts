import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserJobDetailsAndTypicalDistractionsBackfill1771567871348 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE IF EXISTS "users"
      ADD COLUMN IF NOT EXISTS "user_job_details" TEXT;
    `);

    await queryRunner.query(`
      ALTER TABLE IF EXISTS "users"
      ADD COLUMN IF NOT EXISTS "user_typical_distractions" TEXT;
    `);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async down(queryRunner: QueryRunner): Promise<void> {
    // Intentionally no-op: keep rollback safe across environments where these
    // columns may have already been introduced by a previously applied migration.
  }
}
