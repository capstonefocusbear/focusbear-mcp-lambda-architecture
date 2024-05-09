import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTableSurvey1714478144641 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "answer_types" AS ENUM ('CHOICES_NUMBER', 'CHOICES_BOOLEAN', 'TEXT', 'TEXT_AND_RATING');

      CREATE TABLE "survey" (
          "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          "question" varchar NOT NULL,
          "choices" jsonb,
          "answer_type" "answer_types" NOT NULL,
          "creator" uuid NOT NULL,
          "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );
      `);

    await queryRunner.query(`
        ALTER TABLE "survey" ADD CONSTRAINT "FK_u6eHtuWu7rv7UX4xH0QwN6Fu3Si" FOREIGN KEY ("creator") REFERENCES "users"("id");
        CREATE INDEX "IDX_6ZPxFY25u1rVbx5e1P8uEbZdcZ" ON "survey" ("creator");
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TYPE IF EXISTS "answer_types"
      ALTER TABLE "survey" DROP CONSTRAINT IF EXISTS "FK_u6eHtuWu7rv7UX4xH0QwN6Fu3Si";
      DROP INDEX IF EXISTS "public"."IDX_6ZPxFY25u1rVbx5e1P8uEbZdcZ";
      DROP TABLE IF EXISTS "survey";
    `);
  }
}
