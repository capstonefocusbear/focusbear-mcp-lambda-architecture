import { MigrationInterface, QueryRunner } from 'typeorm';

export class updateTablesHabitPacksAndActivityTemplateAddColumnsDeletedAt1666054693250 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "habit_packs" ADD COLUMN "deleted_at" TIMESTAMPTZ;
        ALTER TABLE "activity_template" ADD COLUMN "deleted_at" TIMESTAMPTZ;
      `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "habit_packs" DROP COLUMN IF EXISTS "deleted_at";
        ALTER TABLE "activity_template" DROP COLUMN IF EXISTS "deleted_at";
  `);
  }
}
