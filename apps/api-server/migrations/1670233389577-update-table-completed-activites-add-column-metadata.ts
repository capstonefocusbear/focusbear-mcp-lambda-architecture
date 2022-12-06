import { MigrationInterface, QueryRunner } from 'typeorm';

export class updateTableCompletedActivitesAddColumnMetadata1670233389577 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "completed_activities" ADD COLUMN "metadata" JSONB;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "completed_activities" DROP COLUMN IF EXISTS "metadata";
    `);
  }
}
