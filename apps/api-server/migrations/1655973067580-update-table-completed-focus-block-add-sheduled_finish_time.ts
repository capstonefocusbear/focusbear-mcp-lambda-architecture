import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTableCompletedFocusBlockAddSheduledFinishTime1655973067580 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "completed_focus_blocks"
        ADD COLUMN "scheduled_finish_time" TIMESTAMP NOT NULL
      ;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "completed_focus_blocks"
        DROP COLUMN IF EXISTS "scheduled_finish_time"
      ;
    `);
  }
}
