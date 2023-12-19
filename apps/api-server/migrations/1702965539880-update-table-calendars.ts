import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTableCalendars1702965539880 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "calendars" ADD COLUMN "is_selected" BOOLEAN NOT NULL DEFAULT 'false';
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "calendars" DROP COLUMN IF EXISTS "is_selected";
        `);
  }
}
