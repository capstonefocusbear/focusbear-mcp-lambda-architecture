import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsEndOfStudyQuestionnaireCompletedStudyParticipants1710000000005 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE study_participants
      ADD COLUMN is_eos_questionnaire_completed BOOLEAN NOT NULL DEFAULT FALSE;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE study_participants
      DROP COLUMN is_eos_questionnaire_completed;
    `);
  }
}
