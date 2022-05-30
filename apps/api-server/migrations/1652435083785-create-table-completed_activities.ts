import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTableCompletedActivities1652435083785 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "completed_activities" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "activity_sequence_id" UUID REFERENCES "activity_sequences",
        "activity_id" UUID REFERENCES "activities",
        "user_id" UUID REFERENCES "users",
        "timestamp" TIMESTAMP,
        "quantity_logged" NUMERIC,
        "activity_note" TEXT,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );

      CREATE INDEX ON "completed_activities" ("activity_sequence_id");
      CREATE INDEX ON "completed_activities" ("user_id");
      CREATE INDEX ON "completed_activities" ("activity_id");
      CREATE INDEX ON "completed_activities" ("timestamp");
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS "completed_activities";
    `);
  }
}
