import { MigrationInterface, QueryRunner } from 'typeorm';

export class updateTableUsersAddColumnHasConsentedToPrivacyPolicy1761440000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "users" ADD "has_consented_to_privacy_policy" boolean');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN "has_consented_to_privacy_policy"');
  }
}
