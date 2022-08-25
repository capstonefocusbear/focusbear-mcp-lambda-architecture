import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTableCompletedActivitySequencesAddFields1661434100508 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "completed_activity_sequences" 
        ADD COLUMN "plan_duration_minutes" NUMERIC,
        ADD COLUMN "duration_percent_deviation" INTEGER
      ;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "completed_activity_sequences"
        DROP COLUMN IF EXISTS "plan_duration_minutes",
        DROP COLUMN IF EXISTS "duration_percent_deviation"
      ;
    `);
  }
}
