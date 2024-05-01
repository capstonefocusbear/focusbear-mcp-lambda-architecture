import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTableSurveyAnswerMetadataAddColumnSurveyAnswerId1714569347307 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "survey-metadata" ADD COLUMN "survey_answer_id" uuid;
                CREATE INDEX "IDX_9baP5PDRdTQ94i8VbLg8aaPxAZ" ON "survey-metadata" ("survey_answer_id");
                
              `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "survey-metadata" DROP COLUMN IF EXISTS "survey_answer_id";
        DROP INDEX IF EXISTS "public"."IDX_9baP5PDRdTQ94i8VbLg8aaPxAZ";
              `);
  }
}
