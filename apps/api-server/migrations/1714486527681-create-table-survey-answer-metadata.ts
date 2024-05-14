import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTableSurveyAnswerMetadata1714486527681 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "survey_answer_metadata" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "feature" character varying NOT NULL,
        "device" character varying NOT NULL,
        "operating_system" character varying NOT NULL,
        "version" character varying NOT NULL,
        "survey_id" uuid NOT NULL,
        "survey_answer_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(`
        CREATE INDEX "IDX_eJjqSvhNbEEG63HJyKd599K2kl" ON "survey_answer_metadata" ("user_id");
        CREATE INDEX "IDX_VhFZW0MmN9MK0j7a46Odm34bHx" ON "survey_answer_metadata" ("survey_id");
        CREATE INDEX "IDX_lH8P0N3z82dEu7b6NNy2BkGu6I" ON "survey_answer_metadata" ("survey_answer_id");
        
        ALTER TABLE "survey_answer_metadata" ADD CONSTRAINT "FK_R3i8H70N6owNahla6NAHrBKJMP" FOREIGN KEY ("user_id") REFERENCES "users"("id");
        ALTER TABLE "survey_answer_metadata" ADD CONSTRAINT "FK_ismRaV8by7hUqi8QfP2uE5GXsP" FOREIGN KEY ("survey_id") REFERENCES "survey"("id");
        ALTER TABLE "survey_answer_metadata" ADD CONSTRAINT "FK_Stvl6MJ9MsMUpVG30FG8wp3LIz" FOREIGN KEY ("survey_answer_id") REFERENCES "survey_answer"("id")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "public"."IDX_eJjqSvhNbEEG63HJyKd599K2kl";
      DROP INDEX IF EXISTS "public"."IDX_VhFZW0MmN9MK0j7a46Odm34bHx";
      DROP INDEX IF EXISTS "public"."IDX_lH8P0N3z82dEu7b6NNy2BkGu6I";
     
      ALTER TABLE "survey_answer_metadata" DROP CONSTRAINT IF EXISTS "FK_R3i8H70N6owNahla6NAHrBKJMP";
      ALTER TABLE "survey_answer_metadata" DROP CONSTRAINT IF EXISTS "FK_ismRaV8by7hUqi8QfP2uE5GXsP";
      ALTER TABLE "survey_answer_metadata" DROP CONSTRAINT IF EXISTS "FK_Stvl6MJ9MsMUpVG30FG8wp3LIz";
     
      DROP TABLE IF EXISTS "survey_answer_metadata";
    `);
  }
}
