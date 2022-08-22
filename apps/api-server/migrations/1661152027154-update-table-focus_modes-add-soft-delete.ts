import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTableFocusModesAddSoftDelete1661152027154 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "focus_modes" ADD COLUMN "deleted_at" TIMESTAMPTZ;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "focus_modes" DROP COLUMN IF EXISTS "deleted_at";
    `);
  }
}
