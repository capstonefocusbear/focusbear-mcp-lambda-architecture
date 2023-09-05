import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTableUsersAddColumnZohoUserId1693899475067 implements MigrationInterface {
  name = 'UpdateTableUsersAddColumnZohoUserId1693899475067';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "users" ADD "zoho_user_id" character varying');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN "zoho_user_id"');
  }
}
