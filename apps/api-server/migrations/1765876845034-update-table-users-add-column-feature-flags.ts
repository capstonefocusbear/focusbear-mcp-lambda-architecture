import { MigrationInterface, QueryRunner } from 'typeorm';

export class updateTableUsersAddColumnFeatureFlags1765876845034 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "feature_flags" JSONB NOT NULL DEFAULT '[]'::jsonb;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN IF EXISTS "feature_flags";
    `);
  }
}
