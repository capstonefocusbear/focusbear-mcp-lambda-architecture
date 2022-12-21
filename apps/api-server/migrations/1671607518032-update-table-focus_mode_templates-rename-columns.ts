import { MigrationInterface, QueryRunner } from 'typeorm';

export class updateTableFocusModeTemplatesRenameColumns1671607518032 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "focus_mode_templates" RENAME COLUMN "user_id" TO "author_id";
        ALTER TABLE "focus_mode_templates" RENAME COLUMN "creator_name" TO "author_name";
  `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "focus_mode_templates" RENAME COLUMN "author_id" TO "user_id";
        ALTER TABLE "focus_mode_templates" RENAME COLUMN "author_name" TO "creator_name";
  `);
  }
}
