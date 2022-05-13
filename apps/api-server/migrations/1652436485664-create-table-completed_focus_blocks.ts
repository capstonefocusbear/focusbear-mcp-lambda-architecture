import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTableCompletedFocusBlocks1652436485664 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "completed_focus_blocks" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" UUID REFERENCES "users",
        "focus_mode_id" UUID REFERENCES "focus_modes",
        "start_time" TIMESTAMP,
        "finish_time" TIMESTAMP,
        "intention" VARCHAR(255),
        "achievements" VARCHAR(255),
        "distractions" VARCHAR(255),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );

      CREATE INDEX ON "completed_focus_blocks" ("user_id");
      CREATE INDEX ON "completed_focus_blocks" ("focus_mode_id");
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS "completed_focus_blocks";
    `);
  }
}
