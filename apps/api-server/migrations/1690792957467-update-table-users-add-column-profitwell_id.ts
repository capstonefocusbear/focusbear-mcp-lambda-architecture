import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTableUsersAddColumnProfitwellId1690792957467 implements MigrationInterface {
  name = 'UpdateTableUsersAddColumnProfitwellId1690792957467';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "users" ADD "profitwell_id" character varying(255)');
    await queryRunner.query('ALTER TABLE "users" ADD "profitwell_registration_date" TIMESTAMP WITH TIME ZONE');
    await queryRunner.query('ALTER TABLE "users" ADD "revenue_cat_data" jsonb');
    await queryRunner.query('ALTER TABLE "users" ADD "revenue_cat_status" character varying');
    await queryRunner.query('ALTER TABLE "users" ADD "last_date_revenue_cat_data_synced" TIMESTAMP WITH TIME ZONE');
    await queryRunner.query('ALTER TABLE "users" ADD "last_status_synced_with_profitwell" character varying');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN "profitwell_registration_date"');
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN "profitwell_id"');
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN "last_status_synced_with_profitwell"');
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN "last_date_revenue_cat_data_synced"');
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN "revenue_cat_status"');
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN "revenue_cat_data"');
  }
}
