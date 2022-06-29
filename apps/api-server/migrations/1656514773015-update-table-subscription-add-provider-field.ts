import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTableSubscriptionAddProviderField1656514773015 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "subscription_providers" AS ENUM ('stripe', 'in_app_apple', 'in_app_google');
      ALTER TABLE "subscriptions"
        ADD COLUMN "provider" "subscription_providers"
      ;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "subscriptions"
        DROP COLUMN IF EXISTS "provider"
      ;
    `);
  }
}
