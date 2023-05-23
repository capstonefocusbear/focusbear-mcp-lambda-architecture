import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTableUsersAddColumnLastTimeUserSettingsModified1684743700928 implements MigrationInterface {
  name = 'UpdateTableUsersAddColumnLastTimeUserSettingsModified1684743700928';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "users" ADD "last_time_user_settings_modified" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN "last_time_user_settings_modified"');
  }
}
