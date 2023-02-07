import { MigrationInterface, QueryRunner } from 'typeorm';

export class createTableUserConsent1675314753799 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        CREATE TYPE "consent_types" AS ENUM ('event_tracking', 'email_marketing', 'privacy_policy', 'terms_of_service', 'data_processing');

        CREATE TABLE "user_consent" (
            "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            "user_id" UUID REFERENCES "users",
            "consent_type" "consent_types",
            "consent_status" BOOLEAN DEFAULT 'false',
            "metadata" JSONB,
            "withdrawal_date" TIMESTAMP WITH TIME ZONE,
            "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );

        CREATE INDEX ON "user_consent" ("user_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        DROP TABLE IF EXISTS "user_consent";
    `);
  }
}
