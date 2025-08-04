import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTableUserOnboarding1753165000001 implements MigrationInterface {
  name = 'CreateTableUserOnboarding1753165000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."platform_enum" AS ENUM(
        'MacOS', 
        'Windows', 
        'Android', 
        'iOS', 
        'Web',
        'Unknown'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "user_onboarding" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" UUID NOT NULL,
        "onboarding" JSONB,
        "platform" "public"."platform_enum" NOT NULL DEFAULT 'Unknown',
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
      CREATE INDEX "IDX_user_onboarding_user_id" ON "user_onboarding" ("user_id");
      CREATE INDEX "IDX_user_onboarding_platform" ON "user_onboarding" ("platform");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_user_onboarding_user_id";
      DROP INDEX IF EXISTS "IDX_user_onboarding_platform";
    `);
    await queryRunner.query(`
      DROP TYPE IF EXISTS "public"."platform_enum"
    `);
    await queryRunner.query(`
      ALTER TABLE "user_onboarding" DROP CONSTRAINT IF EXISTS "UQ_user_onboarding_user_id";
      ALTER TABLE "user_onboarding" DROP CONSTRAINT IF EXISTS "FK_user_onboarding_user_id";
    `);
    await queryRunner.query(`
      DROP TABLE IF EXISTS "user_onboarding"
    `);
  }
}
