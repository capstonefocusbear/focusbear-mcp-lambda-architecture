import { MigrationInterface, QueryRunner } from 'typeorm';

export class updateTableActivitiesAddColumnDaysOfWeek1676894219629 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "activities" ADD COLUMN "days_of_week" JSONB NOT NULL DEFAULT '["ALL"]'::jsonb;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "activities" DROP COLUMN IF EXISTS "days_of_week";
    `);
  }
}
