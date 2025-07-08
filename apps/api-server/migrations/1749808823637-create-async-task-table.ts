import { MigrationInterface, QueryRunner } from 'typeorm';

export class createAsyncTaskTable1749808823637 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        CREATE TYPE "async_task_status_enum" AS ENUM ('pending', 'processing', 'completed', 'failed');
    `);

    await queryRunner.query(`
        CREATE TABLE "async_tasks" (
            "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            "status" "async_task_status_enum" NOT NULL DEFAULT 'pending',
            "metadata" JSONB,
            "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );
    `);

    await queryRunner.query(`
        CREATE INDEX "IDX_async_tasks_status" ON "async_tasks" ("status");
    `);

    await queryRunner.query(`
        CREATE INDEX "IDX_async_tasks_created_at" ON "async_tasks" ("created_at");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        DROP INDEX IF EXISTS "IDX_async_tasks_created_at";
    `);

    await queryRunner.query(`
        DROP INDEX IF EXISTS "IDX_async_tasks_status";
    `);

    await queryRunner.query(`
        DROP TABLE IF EXISTS "async_tasks";
    `);

    await queryRunner.query(`
        DROP TYPE IF EXISTS "async_task_status_enum";
    `);
  }
}
