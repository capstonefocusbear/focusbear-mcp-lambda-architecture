import { MigrationInterface, QueryRunner } from 'typeorm';

export class updateTableActivitiesAddColumnRunMicroBreaks1671845673972 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "activities" ADD COLUMN "run_micro_breaks" BOOLEAN DEFAULT 'false';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "activities" DROP COLUMN IF EXISTS "run_micro_breaks";
    `);
  }
}
