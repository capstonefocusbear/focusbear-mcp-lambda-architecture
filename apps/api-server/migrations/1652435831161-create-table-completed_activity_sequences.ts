import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTableCompletedActivitySequences1652435831161 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "completed_activity_sequences" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "activity_sequence_id" UUID REFERENCES "activity_sequences" ON DELETE SET NULL ON UPDATE CASCADE,
        "user_id" UUID REFERENCES "users",
        "start_time" TIMESTAMP,
        "duration_minutes" NUMERIC,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );

      CREATE INDEX ON "completed_activity_sequences" ("activity_sequence_id");
      CREATE INDEX ON "completed_activity_sequences" ("user_id");
      CREATE INDEX ON "completed_activity_sequences" ("start_time");
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS "completed_activity_sequences";
    `);
  }
}
