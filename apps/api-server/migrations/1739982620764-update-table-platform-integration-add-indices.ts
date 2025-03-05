import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTablePlatformIntegrationAddIndices1739982620764 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE INDEX "IDX_axkykmeh2d0708qs85r1nwih1b" ON "platform_integrations" ("user_id") ');
    await queryRunner.query('CREATE INDEX "IDX_1jtfjwb582e5iddb0pa0c5jore" ON "platform_integrations" ("platform") ');
    await queryRunner.query(
      'CREATE INDEX "IDX_9gmpnq10kzqlqi362nb93l79au" ON "platform_integrations" ("external_user_id") ',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "public"."IDX_axkykmeh2d0708qs85r1nwih1b"');
    await queryRunner.query('DROP INDEX "public"."IDX_1jtfjwb582e5iddb0pa0c5jore"');
    await queryRunner.query('DROP INDEX "public"."IDX_9gmpnq10kzqlqi362nb93l79au"');
  }
}
