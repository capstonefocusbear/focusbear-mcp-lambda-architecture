import { MigrationInterface, QueryRunner } from 'typeorm';

export class DeleteTableSubscriptions1662362746018 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS "subscriptions";
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "subscription_statuses" AS ENUM ('trial', 'active', 'payment failed', 'cancelled');

      CREATE TABLE "subscriptions" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" UUID REFERENCES "users",
        "subscription_metadata" JSONB,
        "subscription_status" "subscription_statuses",
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );

      CREATE INDEX ON "subscriptions" ("user_id");
    `);
  }
}
