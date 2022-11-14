import { MigrationInterface, QueryRunner } from 'typeorm';

export class updateTableHabitPacksAddColumnsLanguageAndFeaturedForOnboarding1668391484265
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "habit_packs" ADD COLUMN "featured_for_onboarding" BOOLEAN DEFAULT 'false';
        ALTER TABLE "habit_packs" ADD COLUMN "language" VARCHAR(255);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "habit_packs" DROP COLUMN IF EXISTS "featured_for_onboarding";
        ALTER TABLE "habit_packs" DROP COLUMN IF EXISTS "language";
    `);
  }
}
