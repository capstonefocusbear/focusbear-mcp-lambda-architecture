import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTableUsersAddColumnVerboseLogging1684124057745 implements MigrationInterface {
  name = 'UpdateTableUsersAddColumnVerboseLogging1684124057745';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "users" ADD COLUMN "verbose_logging" boolean NOT NULL DEFAULT false');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN "verbose_logging"');
  }
}
