import { MigrationInterface, QueryRunner } from 'typeorm';

export class updateTableActivitySequencesAddFields1661422256305 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "activity_sequences" 
        ADD COLUMN "generated_sequence_activity_ids" JSONB,
        ADD COLUMN "generated_total_duration_seconds" NUMERIC
      ;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "activity_sequences"
        DROP COLUMN IF EXISTS "generated_sequence_activity_ids",
        DROP COLUMN IF EXISTS "generated_total_duration_seconds"
      ;
    `);
  }
}
