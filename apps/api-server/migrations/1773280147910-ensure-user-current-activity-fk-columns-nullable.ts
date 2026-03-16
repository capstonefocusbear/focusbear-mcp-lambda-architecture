import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnsureUserCurrentActivityFkColumnsNullable1773280147910 implements MigrationInterface {
  name = 'EnsureUserCurrentActivityFkColumnsNullable1773280147910';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "users" ALTER COLUMN "current_activity_sequence_id" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "users" ALTER COLUMN "last_completed_sequence_id" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "users" ALTER COLUMN "current_activity_id" DROP NOT NULL');
  }

  public async down(): Promise<void> {
    // These columns were originally introduced as nullable, so there is no schema change to restore.
  }
}
