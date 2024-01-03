import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateNotificationsIndex1703146978647 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "notifications" DROP CONSTRAINT IF EXISTS "notifications_external_id_key"');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "notifications" ADD CONSTRAINT "notifications_external_id_key" UNIQUE ("external_id");',
    );
  }
}
