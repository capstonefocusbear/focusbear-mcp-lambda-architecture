import { MigrationInterface, QueryRunner } from 'typeorm';

export class updateTableCompletedFocusBlocksAddFieldFocusDurationSeconds1678438430036 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "completed_focus_blocks" ADD COLUMN "focus_duration_seconds" NUMERIC NOT NULL DEFAULT 0;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "completed_focus_blocks" DROP COLUMN IF EXISTS "focus_duration_seconds";
    `);
  }
}
