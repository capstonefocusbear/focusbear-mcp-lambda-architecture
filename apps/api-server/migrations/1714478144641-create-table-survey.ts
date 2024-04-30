import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTableSurvey1714478144641 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
    CREATE TYPE "answer_types" AS ENUM ('CHOICES_NUMBER', 'CHOICES_BOOLEAN', 'TEXT', 'TEXT_AND_RATING');

          CREATE TABLE "survey" (
            "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            "question" varchar NOT NULL,
            "choices" varchar[],
            "answer_type" "answer_types" NOT NULL,
            "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
          );
        `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
          DROP TABLE IF EXISTS "survey";
        `);
  }
}
