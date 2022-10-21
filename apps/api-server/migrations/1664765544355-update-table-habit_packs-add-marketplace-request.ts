import { MigrationInterface, QueryRunner } from 'typeorm';

export class IpdateTableHabitPacksAddMarketplaceRequest1664765544355 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "habit_packs" ADD COLUMN "marketplace_request" "marketplace_request";
      `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "habit_packs" DROP COLUMN IF EXISTS "marketplace_request";
      `);
  }
}
