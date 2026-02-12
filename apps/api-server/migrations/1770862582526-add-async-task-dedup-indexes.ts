import { MigrationInterface, QueryRunner } from 'typeorm';

export const transaction = 'none';

export class AddAsyncTaskDedupIndexes1770862582526 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_async_tasks_dedup_processing_lookup"
      ON "async_tasks" (
        (metadata ->> 'taskType'),
        (metadata ->> 'userId'),
        (metadata ->> 'requestHash'),
        "created_at" DESC
      )
      WHERE "status" = 'processing';
    `);

    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_async_tasks_dedup_pending_lookup"
      ON "async_tasks" (
        (metadata ->> 'taskType'),
        (metadata ->> 'userId'),
        (metadata ->> 'requestHash'),
        "updated_at" DESC,
        "created_at" DESC
      )
      WHERE "status" = 'pending';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX CONCURRENTLY IF EXISTS "IDX_async_tasks_dedup_pending_lookup";
    `);

    await queryRunner.query(`
      DROP INDEX CONCURRENTLY IF EXISTS "IDX_async_tasks_dedup_processing_lookup";
    `);
  }
}
