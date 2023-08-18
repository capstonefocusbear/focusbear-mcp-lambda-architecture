import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTableUsersAddZohoColumns1691552897133 implements MigrationInterface {
  name = 'UpdateTableUsersAddZohoColumns1691552897133';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "users" ADD "zoho_location" character varying');
    await queryRunner.query('ALTER TABLE "users" ADD "zoho_access_token" character varying');
    await queryRunner.query('ALTER TABLE "users" ADD "zoho_refresh_token" character varying');
    await queryRunner.query('ALTER TABLE "users" ADD "zoho_account_server" character varying');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN "zoho_account_server"');
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN "zoho_refresh_token"');
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN "zoho_access_token"');
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN "zoho_location"');
  }
}
