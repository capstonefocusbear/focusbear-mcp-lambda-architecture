import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserOnboardingTable1753165000001 implements MigrationInterface {
  name = 'CreateUserOnboardingTable1753165000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "user_onboarding" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" UUID NOT NULL,
        "onboarding" JSONB,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "user_onboarding" 
      ADD CONSTRAINT "UQ_user_onboarding_user_id" UNIQUE ("user_id")
    `);

    await queryRunner.query(`
      ALTER TABLE "user_onboarding" 
      ADD CONSTRAINT "FK_user_onboarding_user_id" 
      FOREIGN KEY ("user_id") REFERENCES "users"("id") 
      ON DELETE CASCADE ON UPDATE CASCADE
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_user_onboarding_user_id" ON "user_onboarding" ("user_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS "user_onboarding"
    `);
  }
}
