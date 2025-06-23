import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAfterStudyFlankerEffectToStudyParticipants1710000000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE study_participants
      ADD COLUMN after_study_flanker_effect float;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE study_participants
      DROP COLUMN after_study_flanker_effect;
    `);
  }
}
