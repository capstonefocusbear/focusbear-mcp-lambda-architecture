import { MigrationInterface, QueryRunner } from 'typeorm';

export class updateTableFocusModeTemplatesAddPlainTextFields1678848317583 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "focus_mode_templates" ADD COLUMN "description_plain_text" VARCHAR DEFAULT NULL;
        ALTER TABLE "focus_mode_templates" ADD COLUMN "welcome_message_plain_text" VARCHAR DEFAULT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "focus_mode_templates" DROP COLUMN IF EXISTS "description_plain_text";
        ALTER TABLE "focus_mode_templates" DROP COLUMN IF EXISTS "welcome_message_plain_text";
    `);
  }
}
