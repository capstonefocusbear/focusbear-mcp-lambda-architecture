import { MigrationInterface, QueryRunner } from 'typeorm';

export class updateTableUsersAddColumnCurrentSequenceSkippedActivities1668001002101 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "users" ADD COLUMN "current_sequence_skipped_activities" JSONB;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "users" DROP COLUMN IF EXISTS "current_sequence_skipped_activities";
    `);
  }
}
