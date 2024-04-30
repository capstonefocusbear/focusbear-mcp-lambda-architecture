import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTableAnswer1714479308625 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
              CREATE TABLE "answer" (
                "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                "reply" character varying NOT NULL,
                "rating" SMALLINT,
                "completed" BOOLEAN DEFAULT 'false',
                "survey_id" uuid NOT NULL,
                "user_id" uuid NOT NULL,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
              );

              CREATE INDEX ON "answer" ("user_id");
              CREATE INDEX ON "answer" ("survey_id");
            `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
              DROP TABLE IF EXISTS "answer";
            `);
  }
}
