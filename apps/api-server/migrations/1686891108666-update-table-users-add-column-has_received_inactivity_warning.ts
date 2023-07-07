import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTableUsersAddColumnHasReceivedInactivityWarning1686891108666 implements MigrationInterface {
  name = 'UpdateTableUsersAddColumnHasReceivedInactivityWarning1686891108666';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "users" ADD "has_received_inactivity_warning" boolean NOT NULL DEFAULT false');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN "has_received_inactivity_warning"');
  }
}
