import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAppVersionsTable1761747840436 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "app_versions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "operating_system" "public"."operating_systems" NOT NULL,
        "semver_string" character varying(50) NOT NULL,
        "is_supported" boolean NOT NULL DEFAULT false,
        "is_beta_only" boolean NOT NULL DEFAULT false,
        "release_notes" text,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_app_versions_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_app_versions_os_semver" UNIQUE ("operating_system", "semver_string")
      );
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_app_versions_operating_system" ON "app_versions" ("operating_system");
      CREATE INDEX "IDX_app_versions_is_supported" ON "app_versions" ("is_supported");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "public"."IDX_app_versions_is_supported";
      DROP INDEX IF EXISTS "public"."IDX_app_versions_operating_system";
    `);
    await queryRunner.query(`
      DROP TABLE IF EXISTS "app_versions";
    `);
  }
}
