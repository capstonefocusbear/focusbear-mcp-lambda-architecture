import { MigrationInterface, QueryRunner } from 'typeorm';

export class updateTableHabitPacksAddFieldsForRoutineDurations1678849587144 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "habit_packs" ADD COLUMN "morning_routine_duration_seconds" NUMERIC DEFAULT 0;
        ALTER TABLE "habit_packs" ADD COLUMN "evening_routine_duration_seconds" NUMERIC DEFAULT 0;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "habit_packs" DROP COLUMN IF EXISTS "morning_routine_duration_seconds";
        ALTER TABLE "habit_packs" DROP COLUMN IF EXISTS "evening_routine_duration_seconds";
    `);
  }
}
