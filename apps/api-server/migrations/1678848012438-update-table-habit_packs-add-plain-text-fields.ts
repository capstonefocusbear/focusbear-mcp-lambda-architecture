import { MigrationInterface, QueryRunner } from 'typeorm';

export class updateTableHabitPacksAddPlainTextFields1678848012438 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "habit_packs" ADD COLUMN "description_plain_text" VARCHAR DEFAULT NULL;
        ALTER TABLE "habit_packs" ADD COLUMN "welcome_message_plain_text" VARCHAR DEFAULT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "habit_packs" DROP COLUMN IF EXISTS "description_plain_text";
        ALTER TABLE "habit_packs" DROP COLUMN IF EXISTS "welcome_message_plain_text";
    `);
  }
}
