import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTableUserAddLocalDeviceSettings1660119057929 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users" ADD COLUMN "local_device_settings" JSONB;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN IF EXISTS "local_device_settings";
    `);
  }
}
