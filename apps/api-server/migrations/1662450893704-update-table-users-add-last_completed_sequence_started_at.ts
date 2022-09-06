import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTableUsersAddLastCompletedSequenceStartedAt1662450893704 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users" ADD COLUMN "current_sequence_started_at" TIMESTAMPTZ;
      ALTER TABLE "users" ADD COLUMN "last_completed_sequence_started_at" TIMESTAMPTZ;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN IF EXISTS "current_sequence_started_at";
      ALTER TABLE "users" DROP COLUMN IF EXISTS "last_completed_sequence_started_at";
    `);
  }
}
