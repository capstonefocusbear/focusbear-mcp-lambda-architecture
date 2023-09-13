import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTableSyncedProjects1694500118864 implements MigrationInterface {
  name = 'CreateTableSyncedProjects1694500118864';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE TABLE "synced_projects" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), "user_id" uuid NOT NULL, "external_project_id" character varying, "available_statuses" jsonb, CONSTRAINT "PK_3852e366cd13c36d2d0dbb65d72" PRIMARY KEY ("id"))',
    );
    await queryRunner.query('CREATE INDEX "IDX_8f37f484ea02326a53cace8834" ON "synced_projects" ("user_id") ');
    await queryRunner.query(
      'CREATE INDEX "IDX_ffec5bf921b2aa466d200495dc" ON "synced_projects" ("external_project_id") ',
    );
    await queryRunner.query('ALTER TABLE "to_do" ADD "synced_project_id" uuid');
    await queryRunner.query('CREATE INDEX "IDX_5ea195be1dd308c7f4e677f7f7" ON "to_do" ("synced_project_id") ');
    await queryRunner.query(
      'ALTER TABLE "synced_projects" ADD CONSTRAINT "FK_8f37f484ea02326a53cace88348" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "to_do" ADD CONSTRAINT "FK_5ea195be1dd308c7f4e677f7f73" FOREIGN KEY ("synced_project_id") REFERENCES "synced_projects"("id") ON DELETE SET NULL ON UPDATE CASCADE',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "to_do" DROP CONSTRAINT "FK_5ea195be1dd308c7f4e677f7f73"');
    await queryRunner.query('ALTER TABLE "synced_projects" DROP CONSTRAINT "FK_8f37f484ea02326a53cace88348"');
    await queryRunner.query('DROP INDEX "public"."IDX_5ea195be1dd308c7f4e677f7f7"');
    await queryRunner.query('ALTER TABLE "to_do" DROP COLUMN "synced_project_id"');
    await queryRunner.query('DROP INDEX "public"."IDX_ffec5bf921b2aa466d200495dc"');
    await queryRunner.query('DROP INDEX "public"."IDX_8f37f484ea02326a53cace8834"');
    await queryRunner.query('DROP TABLE "synced_projects"');
  }
}
