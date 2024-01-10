import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTablePlatformIntegrations1704886081042 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "platform_integrations" ADD COLUMN only_assigned BOOLEAN NOT NULL DEFAULT true;',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "platform_integrations" DROP COLUMN only_assigned;');
  }
}
