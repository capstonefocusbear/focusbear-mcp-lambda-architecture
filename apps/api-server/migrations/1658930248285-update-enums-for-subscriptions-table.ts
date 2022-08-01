import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateEnumsForSubscriptionsTable1658930248285 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE "subscription_statuses" RENAME VALUE 'trial' TO 'expired';
      CREATE TYPE "types" AS ENUM ('trial', 'personal', 'team_owner', 'team_member');
      ALTER TABLE "subscriptions" ADD COLUMN "type" "types" NOT NULL;
      ALTER TYPE "subscription_providers" RENAME VALUE 'in_app_apple' TO 'app_store';
      ALTER TYPE "subscription_providers" RENAME VALUE 'in_app_google' TO 'play_store';
      ALTER TYPE "subscription_providers" ADD VALUE 'mac_app_store';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE "subscription_statuses" RENAME VALUE 'expired' TO 'trial';
      DROP TYPE IF EXISTS "types";
      ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "type";
      ALTER TYPE "subscription_providers" RENAME VALUE 'app_store' TO 'in_app_apple';
      ALTER TYPE "subscription_providers" RENAME VALUE 'play_store' TO 'in_app_google';
    `);
  }
}
