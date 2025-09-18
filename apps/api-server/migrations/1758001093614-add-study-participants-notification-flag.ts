import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStudyParticipantsNotificationFlag1758001093614 implements MigrationInterface {
  name = 'AddStudyParticipantsNotificationFlag1758001093614';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE study_participants
      ADD COLUMN IF NOT EXISTS last_data_sync_notified_at TIMESTAMPTZ NULL,
      ADD COLUMN IF NOT EXISTS reserved_at TIMESTAMPTZ NULL;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_study_participants_reserved_at ON study_participants(reserved_at);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_study_participants_reserved_at;
    `);
    await queryRunner.query(`
      ALTER TABLE study_participants
      DROP COLUMN IF EXISTS reserved_at,
      DROP COLUMN IF EXISTS last_data_sync_notified_at;
    `);
  }
}
