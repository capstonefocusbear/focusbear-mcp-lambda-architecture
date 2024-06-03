import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateNotificationDescription1717389352316 implements MigrationInterface {
  name = 'UpdateNotificationDescription1717389352316';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "notifications" ALTER COLUMN "description" TYPE TEXT;');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "notifications" ALTER COLUMN "description" TYPE VARCHAR(10000);');
  }
}
