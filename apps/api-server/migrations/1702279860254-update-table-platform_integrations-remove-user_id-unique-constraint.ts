import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTablePlatformIntegrationsRemoveUserIdUniqueConstraint1702279860254 implements MigrationInterface {
  name = 'UpdateTablePlatformIntegrationsRemoveUserIdUniqueConstraint1702279860254';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "platform_integrations" DROP CONSTRAINT "FK_9c13d9639adb3b556179cf788a9"');
    await queryRunner.query('ALTER TABLE "platform_integrations" DROP CONSTRAINT "UQ_9c13d9639adb3b556179cf788a9"');
    await queryRunner.query(
      'ALTER TABLE "platform_integrations" ADD CONSTRAINT "FK_9c13d9639adb3b556179cf788a9" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "platform_integrations" DROP CONSTRAINT "FK_9c13d9639adb3b556179cf788a9"');
    await queryRunner.query(
      'ALTER TABLE "platform_integrations" ADD CONSTRAINT "UQ_9c13d9639adb3b556179cf788a9" UNIQUE ("user_id")',
    );
    await queryRunner.query(
      'ALTER TABLE "platform_integrations" ADD CONSTRAINT "FK_9c13d9639adb3b556179cf788a9" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
  }
}
