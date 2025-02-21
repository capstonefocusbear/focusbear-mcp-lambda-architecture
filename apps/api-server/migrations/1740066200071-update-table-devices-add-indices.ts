import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTableDevicesAddIndices1740066200071 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE INDEX "IDX_pzsv0ck410cxrvd2v4smbas652" ON "devices" ("is_leader") ');
    await queryRunner.query('CREATE INDEX "IDX_39wsf0gkn86nxvil06558nvgmv" ON "devices" ("app_version") ');
    await queryRunner.query('CREATE INDEX "IDX_ro4m0f7l6atmy2wnnzt26ae192" ON "devices" ("operating_system") ');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "public"."IDX_pzsv0ck410cxrvd2v4smbas652"');
    await queryRunner.query('DROP INDEX "public"."IDX_39wsf0gkn86nxvil06558nvgmv"');
    await queryRunner.query('DROP INDEX "public"."IDX_ro4m0f7l6atmy2wnnzt26ae192"');
  }
}
