import { MigrationInterface, QueryRunner } from 'typeorm';

export class updateTableHabitPacksAddColumnIsFeatured1667788882261 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "habit_packs" ADD COLUMN "is_featured" BOOLEAN DEFAULT 'false';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "habit_packs" DROP COLUMN IF EXISTS "is_featured";
    `);
  }
}
