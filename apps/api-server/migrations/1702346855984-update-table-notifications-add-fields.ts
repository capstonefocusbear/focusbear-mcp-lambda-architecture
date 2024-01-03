import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTableNotificationsAddFields1702346855984 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "notifications"
        ADD COLUMN "platform" character varying(255),
        ADD COLUMN "platform_account" character varying(255),
        ADD COLUMN "calendar_id" character varying(255),
        ADD COLUMN "external_metadata" jsonb
      ;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
          ALTER TABLE "notifications"
              DROP COLUMN IF EXISTS "platform",
              DROP COLUMN IF EXISTS "platform_account",
              DROP COLUMN IF EXISTS "calendar_id",
              DROP COLUMN IF EXISTS "external_metadata"
          ;
        `);
  }
}
