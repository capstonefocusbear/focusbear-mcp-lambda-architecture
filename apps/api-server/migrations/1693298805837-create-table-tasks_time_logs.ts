import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTableTasksTimeLogs1693298805837 implements MigrationInterface {
  name = 'CreateTableTasksTimeLogs1693298805837';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE TABLE "tasks_time_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), "user_id" uuid NOT NULL, "completed_focus_block_id" uuid, "task_id" uuid, "duration_logged_seconds" numeric DEFAULT \'0\', CONSTRAINT "PK_69feaa62e4ff359e48bf501614e" PRIMARY KEY ("id"))',
    );
    await queryRunner.query('CREATE INDEX "IDX_3fba4069433848f500051ceb86" ON "tasks_time_logs" ("user_id") ');
    await queryRunner.query(
      'CREATE INDEX "IDX_d99804fd92b8e732c3e1bcd04e" ON "tasks_time_logs" ("completed_focus_block_id") ',
    );
    await queryRunner.query('CREATE INDEX "IDX_a9e129b656313d358e3290e570" ON "tasks_time_logs" ("task_id") ');
    await queryRunner.query(
      'CREATE INDEX "IDX_77772359214eedc56a47d0e214" ON "tasks_time_logs" ("duration_logged_seconds") ',
    );
    await queryRunner.query(
      'ALTER TABLE "tasks_time_logs" ADD CONSTRAINT "FK_3fba4069433848f500051ceb866" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "tasks_time_logs" ADD CONSTRAINT "FK_a9e129b656313d358e3290e570d" FOREIGN KEY ("task_id") REFERENCES "to_do"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "tasks_time_logs" ADD CONSTRAINT "FK_d99804fd92b8e732c3e1bcd04ee" FOREIGN KEY ("completed_focus_block_id") REFERENCES "completed_focus_blocks"("id") ON DELETE SET NULL ON UPDATE CASCADE',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "tasks_time_logs" DROP CONSTRAINT "FK_d99804fd92b8e732c3e1bcd04ee"');
    await queryRunner.query('ALTER TABLE "tasks_time_logs" DROP CONSTRAINT "FK_a9e129b656313d358e3290e570d"');
    await queryRunner.query('ALTER TABLE "tasks_time_logs" DROP CONSTRAINT "FK_3fba4069433848f500051ceb866"');
    await queryRunner.query('DROP INDEX "public"."IDX_77772359214eedc56a47d0e214"');
    await queryRunner.query('DROP INDEX "public"."IDX_a9e129b656313d358e3290e570"');
    await queryRunner.query('DROP INDEX "public"."IDX_d99804fd92b8e732c3e1bcd04e"');
    await queryRunner.query('DROP INDEX "public"."IDX_3fba4069433848f500051ceb86"');
    await queryRunner.query('DROP TABLE "tasks_time_logs"');
  }
}
