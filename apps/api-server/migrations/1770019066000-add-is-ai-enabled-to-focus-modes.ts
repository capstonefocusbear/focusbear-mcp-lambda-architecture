import { MigrationInterface, QueryRunner } from 'typeorm';

export class addIsAiEnabledToFocusModes1770019066000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "focus_modes"
      ADD COLUMN IF NOT EXISTS "is_ai_enabled" BOOLEAN NOT NULL DEFAULT true;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "focus_modes"
      DROP COLUMN IF EXISTS "is_ai_enabled";
    `);
  }
}
