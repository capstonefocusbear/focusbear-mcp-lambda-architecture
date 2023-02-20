import { MigrationInterface, QueryRunner } from 'typeorm';

export class updateTableUsersAddColumnOnboardingProgress1675820586976 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "users" ADD COLUMN "onboarding_progress" JSONB;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "users" DROP COLUMN IF EXISTS "onboarding_progress";
    `);
  }
}
