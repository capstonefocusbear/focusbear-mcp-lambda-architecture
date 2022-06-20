import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTableActivities1652434393705 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "activity_types" AS ENUM ('break', 'morning', 'evening');
      CREATE TYPE "log_summary_types" AS ENUM ('SUM', 'AVG');

      CREATE TABLE "activities" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" UUID REFERENCES "users",
        "activity_type" "activity_types",
        "log_summary_type" "log_summary_types" DEFAULT 'SUM',
        "log_quantity" BOOLEAN DEFAULT 'false',
        "duration_seconds" NUMERIC NOT NULL DEFAULT 0,
        "activity_data" JSONB,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );

      CREATE INDEX ON "activities" ("user_id");
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS "activities";
    `);
  }
}
