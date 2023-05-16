import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTableUsersAddColumnHasConsentedToTermsOfService1683855253529 implements MigrationInterface {
  name = 'UpdateTableUsersAddColumnHasConsentedToTermsOfService1683855253529';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "users" ADD "has_consented_to_terms_of_service" boolean NOT NULL DEFAULT false',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN "has_consented_to_terms_of_service"');
  }
}
