import { MigrationInterface, QueryRunner } from 'typeorm';

export class addIsBrainDumpToNotes1771290037980 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "notes"
      ADD COLUMN IF NOT EXISTS "is_brain_dump" BOOLEAN NOT NULL DEFAULT false;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "notes"
      DROP COLUMN IF EXISTS "is_brain_dump";
    `);
  }
}
