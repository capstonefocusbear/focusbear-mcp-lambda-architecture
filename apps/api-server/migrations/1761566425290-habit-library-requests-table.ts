import { MigrationInterface, QueryRunner } from 'typeorm';

export class HabitLibraryRequestsTable1761566425290 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "habit_library_requests" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" UUID REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
        "goal" TEXT NOT NULL,
        "habit_name" TEXT NOT NULL,
        "habit_description" TEXT,
        "routine_type" VARCHAR(50),
        "duration_minutes" INTEGER,
        "justification" TEXT,
        "request_metadata" JSONB,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );

      CREATE INDEX "habit_library_requests_user_id_idx" ON "habit_library_requests" ("user_id");
      CREATE INDEX "habit_library_requests_goal_idx" ON "habit_library_requests" ("goal");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "habit_library_requests_goal_idx";
      DROP INDEX IF EXISTS "habit_library_requests_user_id_idx";
      DROP TABLE IF EXISTS "habit_library_requests";
    `);
  }
}
