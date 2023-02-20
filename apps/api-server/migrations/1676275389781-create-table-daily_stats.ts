import { MigrationInterface, QueryRunner } from 'typeorm';

export class createTableDailyStats1676275389781 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "daily_stats" (
          "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          "user_id" UUID REFERENCES "users",
          "date_completed" TIMESTAMP WITH TIME ZONE,
          "morning_routine_completion_percentage" NUMERIC DEFAULT 0,
          "evening_routine_completion_percentage" NUMERIC DEFAULT 0,
          "focus_modes_completed" NUMERIC DEFAULT 0,
          "should_recalculate" BOOLEAN DEFAULT FALSE,
          "morning_sequence_log_id" UUID REFERENCES "completed_activity_sequences",
          "evening_sequence_log_id" UUID REFERENCES "completed_activity_sequences",
          "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );

      CREATE INDEX ON "daily_stats" ("user_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS "daily_stats";
    `);
  }
}
