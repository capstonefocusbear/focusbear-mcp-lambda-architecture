import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTableActivities1652434393705 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "activity_types" AS ENUM ('break', 'morning_routine', 'evening_routine');
      CREATE TYPE "log_quantity_summary_types" AS ENUM ('SUM', 'AVERAGE');

      CREATE TABLE "activities" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" UUID REFERENCES "users",
        "activity_type" "activity_types",
        "log_quantity_summary_type" "log_quantity_summary_types" DEFAULT 'SUM',
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
