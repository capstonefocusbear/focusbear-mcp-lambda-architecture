import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTableUsersAddLastlyCurrentTimestamps1660806001906 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users" ADD COLUMN "current_activity_assigned_at" TIMESTAMPTZ;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN IF EXISTS "current_activity_assigned_at";
    `);
  }
}
