import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPhoneNumberAndOptedOutToStudyParticipants1710000000006 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE study_participants
      ADD COLUMN phone_number VARCHAR(255),
      ADD COLUMN opted_out BOOLEAN NOT NULL DEFAULT FALSE;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE study_participants
      DROP COLUMN phone_number,
      DROP COLUMN opted_out;
    `);
  }
}
