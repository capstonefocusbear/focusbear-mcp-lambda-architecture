import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTablePlatformIntegrations1694073175995 implements MigrationInterface {
  name = 'CreateTablePlatformIntegrations1694073175995';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE TABLE "platform_integrations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), "user_id" uuid NOT NULL, "platform" character varying, "external_user_id" character varying, "data" jsonb, CONSTRAINT "UQ_9c13d9639adb3b556179cf788a9" UNIQUE ("user_id"), CONSTRAINT "PK_d525f5238568b296a2a9a36ce79" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'ALTER TABLE "platform_integrations" ADD CONSTRAINT "FK_9c13d9639adb3b556179cf788a9" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "platform_integrations" DROP CONSTRAINT "FK_9c13d9639adb3b556179cf788a9"');
    await queryRunner.query('DROP TABLE "platform_integrations"');
  }
}
