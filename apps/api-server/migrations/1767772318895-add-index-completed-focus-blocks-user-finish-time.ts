import { MigrationInterface, QueryRunner } from 'typeorm';

export const transaction = 'none';

export class AddIndexCompletedFocusBlocksUserFinishTime1767772318895 implements MigrationInterface {
  name = 'AddIndexCompletedFocusBlocksUserFinishTime1767772318895';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_completed_focus_blocks_user_finish_time"
      ON "completed_focus_blocks" ("user_id", "finish_time")
      WHERE "finish_time" IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX CONCURRENTLY IF EXISTS "IDX_completed_focus_blocks_user_finish_time";
    `);
  }
}
