import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFlankerEffectToStudyParticipants1710000000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE study_participants
      ADD COLUMN flanker_effect float;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE study_participants
      DROP COLUMN flanker_effect;
    `);
  }
}
