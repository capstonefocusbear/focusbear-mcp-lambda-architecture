import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTableDevicesAddColumnAppVersion1698064263980 implements MigrationInterface {
  name = 'UpdateTableDevicesAddColumnAppVersion1698064263980';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "devices" ADD "app_version" character varying');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "devices" DROP COLUMN "app_version"');
  }
}
