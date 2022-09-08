import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTablesUsersCompletedSequencesCompletedActivities1662543327244 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users" ADD COLUMN "current_completing_sequence_log_id" UUID REFERENCES "completed_activity_sequences" ON DELETE SET NULL ON UPDATE SET NULL;
      ALTER TABLE "completed_activities" ADD COLUMN "completed_sequence_id" UUID REFERENCES "completed_activity_sequences" ON DELETE SET NULL ON UPDATE SET NULL;
      ALTER TABLE "completed_activity_sequences" ADD COLUMN "is_completed" BOOLEAN NOT NULL DEFAULT 'true';

      CREATE INDEX ON "users" ("current_completing_sequence_log_id");
      CREATE INDEX ON "completed_activities" ("completed_sequence_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN IF EXISTS "current_completing_sequence_log_id";
      ALTER TABLE "completed_activities" DROP COLUMN IF EXISTS "completed_sequence_id";
      ALTER TABLE "completed_activity_sequences" DROP COLUMN IF EXISTS "is_completed";
    `);
  }
}
