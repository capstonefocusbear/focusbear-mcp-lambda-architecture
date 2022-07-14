import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTableFocusModesAddMetadataField1657805693362 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "focus_modes"
        ADD COLUMN "metadata" JSONB
      ;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "focus_modes"
        DROP COLUMN IF EXISTS "metadata"
      ;
    `);
  }
}
