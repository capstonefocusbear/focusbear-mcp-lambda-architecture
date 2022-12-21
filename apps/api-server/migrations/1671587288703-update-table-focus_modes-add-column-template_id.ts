import { MigrationInterface, QueryRunner } from 'typeorm';

export class updateTableFocusModesAddColumnTemplateId1671587288703 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
    ALTER TABLE "focus_modes"
      ADD COLUMN "focus_mode_template_id" UUID REFERENCES "focus_mode_templates" ON DELETE SET NULL;

    CREATE INDEX ON "focus_modes" ("focus_mode_template_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
    ALTER TABLE "focus_modes"
      DROP COLUMN IF EXISTS "focus_mode_template_id";
    `);
  }
}
