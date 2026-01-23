import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAnnouncementTables1761146267493 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "announcement_type_enum" AS ENUM ('release', 'event', 'survey', 'maintenance');
      CREATE TYPE "announcement_priority_enum" AS ENUM ('low', 'medium', 'high', 'critical');
      CREATE TYPE "announcement_operating_system_enum" AS ENUM ('MacOS', 'Windows', 'Android', 'iOS', 'Web', 'Unknown');
      CREATE TYPE "view_action_enum" AS ENUM ('viewed', 'dismissed');

      CREATE TABLE "announcements" (
        "id" character varying NOT NULL,
        "type" "announcement_type_enum" NOT NULL,
        "heading" character varying NOT NULL,
        "details" text NOT NULL,
        "details_url" character varying,
        "expiry_date" TIMESTAMP NOT NULL,
        "priority" "announcement_priority_enum" NOT NULL DEFAULT 'medium',
        "operating_system" "announcement_operating_system_enum" NOT NULL DEFAULT 'Unknown',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_announcements_id" PRIMARY KEY ("id")
      );

      CREATE TABLE "announcement_views" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "announcement_id" character varying NOT NULL,
        "action" "view_action_enum" NOT NULL DEFAULT 'viewed',
        "source" character varying,
        "read_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_announcement_views_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_announcement_views_announcement" FOREIGN KEY ("announcement_id") REFERENCES "announcements"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_announcement_views_user_announcement" ON "announcement_views" ("user_id", "announcement_id");
      CREATE INDEX "IDX_announcement_views_user_id" ON "announcement_views" ("user_id");
      CREATE INDEX "IDX_announcements_type" ON "announcements" ("type");
      CREATE INDEX "IDX_announcements_priority" ON "announcements" ("priority");
      CREATE INDEX "IDX_announcements_expiry_date" ON "announcements" ("expiry_date");
      CREATE INDEX "IDX_announcements_operating_system" ON "announcements" ("operating_system");
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "public"."IDX_announcements_operating_system";
      DROP INDEX IF EXISTS "public"."IDX_announcements_expiry_date";
      DROP INDEX IF EXISTS "public"."IDX_announcements_priority";
      DROP INDEX IF EXISTS "public"."IDX_announcements_type";
      DROP INDEX IF EXISTS "public"."IDX_announcement_views_user_id";
      DROP INDEX IF EXISTS "public"."IDX_announcement_views_user_announcement";
      DROP TABLE IF EXISTS "announcement_views";
      DROP TABLE IF EXISTS "announcements";
      DROP TYPE IF EXISTS "view_action_enum";
      DROP TYPE IF EXISTS "announcement_operating_system_enum";
      DROP TYPE IF EXISTS "announcement_priority_enum";
      DROP TYPE IF EXISTS "announcement_type_enum";
    `);
  }
}
