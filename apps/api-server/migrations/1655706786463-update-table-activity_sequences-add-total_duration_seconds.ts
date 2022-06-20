import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTableActivitySequencesAddTotalDurationSeconds1655706786463 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "activity_sequences"
        ADD COLUMN "total_duration_seconds" NUMERIC NOT NULL DEFAULT 0
      ;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "activity_sequences"
        DROP COLUMN IF EXISTS "total_duration_seconds"
      ;
    `);
  }
}
