import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTableSurveyMetadataAnswerAddForeinKeys1714635934510 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "survey_answer" ADD CONSTRAINT "FK_u6eHtuWu7rv7UX4xH0QwN6Fu3Si" FOREIGN KEY ("survey_id") REFERENCES "survey"("id");
            ALTER TABLE "survey_answer" ADD CONSTRAINT "FK_pf6kfDk2b3vhm2hG1XSRnbFvNU9" FOREIGN KEY ("user_id") REFERENCES "users"("id");
            ALTER TABLE "survey_metadata" ADD CONSTRAINT "FK_yDBy68p1WnOgL5WBo15cG2b4FIz" FOREIGN KEY ("user_id") REFERENCES "users"("id");
            ALTER TABLE "survey_metadata" ADD CONSTRAINT "FK_KcP8oFol3RNsDuS78T3FE4nBiKk" FOREIGN KEY ("survey_id") REFERENCES "survey"("id");
            ALTER TABLE "survey_metadata" ADD CONSTRAINT "FK_rsnNMx9FmnFR39W5c5E97RdsUam" FOREIGN KEY ("survey_answer_id") REFERENCES "survey_answer"("id")
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "survey_answer" DROP CONSTRAINT IF EXISTS "FK_u6eHtuWu7rv7UX4xH0QwN6Fu3Si";
            ALTER TABLE "survey_answer" DROP CONSTRAINT IF EXISTS "FK_pf6kfDk2b3vhm2hG1XSRnbFvNU9";
            ALTER TABLE "survey_metadata" DROP CONSTRAINT IF EXISTS "FK_yDBy68p1WnOgL5WBo15cG2b4FIz";
            ALTER TABLE "survey_metadata" DROP CONSTRAINT IF EXISTS "FK_KcP8oFol3RNsDuS78T3FE4nBiKk";
            ALTER TABLE "survey_metadata" DROP CONSTRAINT IF EXISTS "FK_rsnNMx9FmnFR39W5c5E97RdsUam";
        `);
  }
}
