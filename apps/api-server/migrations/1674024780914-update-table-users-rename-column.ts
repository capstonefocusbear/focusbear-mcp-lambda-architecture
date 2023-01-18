import { MigrationInterface, QueryRunner } from 'typeorm';

export class updateTableUsersRenameColumn1674024780914 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "users" RENAME COLUMN "cutoff_time" TO "cutoff_time_for_non_high_priority_activities";
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "users" RENAME COLUMN "cutoff_time_for_non_high_priority_activities" TO "cutoff_time";
    `);
  }
}
