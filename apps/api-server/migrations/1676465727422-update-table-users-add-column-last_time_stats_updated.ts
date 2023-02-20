import { MigrationInterface, QueryRunner } from 'typeorm';

export class updateTableUsersAddColumnLastTimeStatsUpdated1676465727422 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "users" ADD COLUMN "last_time_stats_updated" TIMESTAMPTZ DEFAULT NOW();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "users" DROP COLUMN IF EXISTS "last_time_stats_updated";
    `);
  }
}
