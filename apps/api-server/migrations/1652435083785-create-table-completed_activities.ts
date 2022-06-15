import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTableCompletedActivities1652435083785 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "completed_activities" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "activity_sequence_id" UUID REFERENCES "activity_sequences"  ON DELETE SET NULL ON UPDATE CASCADE,
        "activity_id" UUID REFERENCES "activities" ON DELETE SET NULL ON UPDATE CASCADE,
        "user_id" UUID REFERENCES "users",
        "start_time" TIMESTAMP,
        "finish_time" TIMESTAMP,
        "quantity_logged" NUMERIC,
        "duration_logged" NUMERIC,
        "activity_note" TEXT,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );

      CREATE INDEX ON "completed_activities" ("activity_sequence_id");
      CREATE INDEX ON "completed_activities" ("user_id");
      CREATE INDEX ON "completed_activities" ("activity_id");
      CREATE INDEX ON "completed_activities" ("start_time");
      CREATE INDEX ON "completed_activities" ("finish_time");
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS "completed_activities";
    `);
  }
}
