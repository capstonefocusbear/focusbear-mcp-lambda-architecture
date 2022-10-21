import { MigrationInterface, QueryRunner } from 'typeorm';

export class createTableActivityTemplate1664518851966 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        CREATE TABLE "activity_template" (
          "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          "pack_id" UUID REFERENCES "habit_packs",
          "user_id" UUID REFERENCES "users",
          "activity_type" "activity_types",
          "log_summary_type" "log_summary_types" DEFAULT 'SUM',
          "log_quantity" BOOLEAN DEFAULT 'false',
          "activity_data" JSONB,
          "has_choices" BOOLEAN,
          "duration_seconds" NUMERIC NOT NULL DEFAULT 0,
          "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );
  
        CREATE INDEX ON "activity_template" ("user_id");
        CREATE INDEX ON "activity_template" ("pack_id");
      `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        DROP TABLE IF EXISTS "activity_template";
        `);
  }
}
