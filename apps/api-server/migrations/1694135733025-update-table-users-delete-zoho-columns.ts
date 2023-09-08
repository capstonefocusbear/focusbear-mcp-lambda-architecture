import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTableUsersDeleteZohoColumns1694135733025 implements MigrationInterface {
  name = 'UpdateTableUsersDeleteZohoColumns1694135733025';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN "zoho_location"');
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN "zoho_access_token"');
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN "zoho_refresh_token"');
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN "zoho_account_server"');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "users" ADD "zoho_account_server" character varying');
    await queryRunner.query('ALTER TABLE "users" ADD "zoho_refresh_token" character varying');
    await queryRunner.query('ALTER TABLE "users" ADD "zoho_access_token" character varying');
    await queryRunner.query('ALTER TABLE "users" ADD "zoho_location" character varying');
  }
}
