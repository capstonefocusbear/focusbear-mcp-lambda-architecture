import { MigrationInterface, QueryRunner } from 'typeorm';

export class updateTableUsersAddColumnHasEditedSettings1669966097955 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "users" ADD COLUMN "has_edited_settings" BOOLEAN DEFAULT 'false';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "users" DROP COLUMN IF EXISTS "has_edited_settings";
    `);
  }
}
