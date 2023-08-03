import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTableUsersAddRevenueCatColumns1691031038058 implements MigrationInterface {
  name = 'UpdateTableUsersAddRevenueCatColumns1691031038058';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "users" ADD "revenue_cat_data" jsonb');
    await queryRunner.query('ALTER TABLE "users" ADD "revenue_cat_status" character varying');
    await queryRunner.query('ALTER TABLE "users" ADD "last_date_revenue_cat_data_synced" TIMESTAMP WITH TIME ZONE');
    await queryRunner.query('ALTER TABLE "users" ADD "last_status_synced_with_profitwell" character varying');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN "last_status_synced_with_profitwell"');
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN "last_date_revenue_cat_data_synced"');
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN "revenue_cat_status"');
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN "revenue_cat_data"');
  }
}
