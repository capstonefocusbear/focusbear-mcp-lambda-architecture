import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTableSurveyMetadataAnswerRenameWithUnderscore1714635373375 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "survey-answer" RENAME TO "survey_answer";
        ALTER TABLE "survey-metadata" RENAME TO "survey_metadata"
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "survey_answer" RENAME TO "survey-answer";
        ALTER TABLE "survey_metadata" RENAME TO "survey-metadata"
        `);
  }
}
