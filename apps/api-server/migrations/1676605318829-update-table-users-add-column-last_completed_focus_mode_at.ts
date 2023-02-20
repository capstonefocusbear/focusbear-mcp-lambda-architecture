import { MigrationInterface, QueryRunner } from 'typeorm';

export class updateTableUsersAddColumnLastCompletedFocusModeAt1676605318829 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "users" ADD COLUMN "last_completed_focus_mode_at" TIMESTAMPTZ;
        ALTER TABLE "users" ADD COLUMN "morning_routines_streak" NUMERIC DEFAULT 0;
        ALTER TABLE "users" ADD COLUMN "evening_routines_streak" NUMERIC DEFAULT 0;
        ALTER TABLE "users" ADD COLUMN "focus_modes_streak" NUMERIC DEFAULT 0;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "users" DROP COLUMN IF EXISTS "last_completed_focus_mode_at";
        ALTER TABLE "users" DROP COLUMN IF EXISTS "morning_routines_streak";
        ALTER TABLE "users" DROP COLUMN IF EXISTS "evening_routines_streak";
        ALTER TABLE "users" DROP COLUMN IF EXISTS "focus_modes_streak";
    `);
  }
}
