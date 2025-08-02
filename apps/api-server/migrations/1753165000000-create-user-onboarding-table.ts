import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserOnboardingTable1753165000000 implements MigrationInterface {
  name = 'CreateUserOnboardingTable1753165000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "user_onboarding" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "auth0_id" VARCHAR NOT NULL,
        "onboarding" JSONB,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_user_onboarding_auth0_id" ON "user_onboarding" ("auth0_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_user_onboarding_auth0_id"
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS "user_onboarding"
    `);
  }
}
