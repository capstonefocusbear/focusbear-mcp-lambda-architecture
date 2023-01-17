import { MigrationInterface, QueryRunner } from 'typeorm';

export class updateTableUsersRenameColumnCutoffTime1673940512308 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "users" RENAME COLUMN "cutoff_time_for_standard_priority_activities" TO "cutoff_time";
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "users" RENAME COLUMN "cutoff_time" TO "cutoff_time_for_standard_priority_activities";
    `);
  }
}
