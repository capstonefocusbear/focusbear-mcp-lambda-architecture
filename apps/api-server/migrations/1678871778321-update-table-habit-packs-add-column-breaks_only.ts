import { MigrationInterface, QueryRunner } from 'typeorm';

export class updateTableHabitPacksAddColumnBreaksOnly1678871778321 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "habit_packs" ADD COLUMN "breaks_only" BOOLEAN DEFAULT 'false';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "habit_packs" DROP COLUMN IF EXISTS "breaks_only";
    `);
  }
}
