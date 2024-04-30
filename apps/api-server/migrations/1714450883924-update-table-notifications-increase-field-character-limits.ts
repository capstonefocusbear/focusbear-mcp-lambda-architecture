import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTableNotificationsIncreaseFieldCharacterLimits1714450883924 implements MigrationInterface {
  name = 'UpdateTableNotificationsIncreaseFieldCharacterLimits1714450883924';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "notifications" ALTER COLUMN "summary" TYPE VARCHAR(2500);');
    await queryRunner.query('ALTER TABLE "notifications" ALTER COLUMN "description" TYPE VARCHAR(10000);');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "notifications" ALTER COLUMN "summary" TYPE VARCHAR(1000);');
    await queryRunner.query('ALTER TABLE "notifications" ALTER COLUMN "description" TYPE VARCHAR(2500);');
  }
}
