import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTableSyncedProjectsAddColumnPlatform1694571287813 implements MigrationInterface {
  name = 'UpdateTableSyncedProjectsAddColumnPlatform1694571287813';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "synced_projects" ADD "platform" character varying');
    await queryRunner.query('ALTER TABLE "synced_projects" ADD "external_portal_id" character varying');
    await queryRunner.query('CREATE INDEX "IDX_c2005bd90ea7c2deabb2a75b9a" ON "synced_projects" ("platform") ');
    await queryRunner.query(
      'CREATE INDEX "IDX_d3793352b9687b87473fc63141" ON "synced_projects" ("external_portal_id") ',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "public"."IDX_d3793352b9687b87473fc63141"');
    await queryRunner.query('DROP INDEX "public"."IDX_c2005bd90ea7c2deabb2a75b9a"');
    await queryRunner.query('ALTER TABLE "synced_projects" DROP COLUMN "external_portal_id"');
    await queryRunner.query('ALTER TABLE "synced_projects" DROP COLUMN "platform"');
  }
}
