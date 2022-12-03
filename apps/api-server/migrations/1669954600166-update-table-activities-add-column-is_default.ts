import { MigrationInterface, QueryRunner } from 'typeorm';

export class updateTableActivitiesAddColumnIsDefault1669954600166 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "activities" ADD COLUMN "is_default" BOOLEAN DEFAULT 'false';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "activities" DROP COLUMN IF EXISTS "is_default";
    `);
  }
}
