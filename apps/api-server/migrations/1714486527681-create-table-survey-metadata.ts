import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTableSurveyMetadata1714486527681 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
                  CREATE TABLE "survey-metadata" (
                    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    "feature" character varying NOT NULL,
                    "device" character varying NOT NULL,
                    "operating_system" character varying NOT NULL,
                    "version" character varying NOT NULL,
                    "survey_id" uuid NOT NULL,
                    "user_id" uuid NOT NULL,
                    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
                  );
    
                  CREATE INDEX ON "survey-metadata" ("user_id");
                  CREATE INDEX ON "survey-metadata" ("survey_id");
                `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
                  DROP TABLE IF EXISTS "survey-metadata";
                `);
  }
}
