import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTableCalendar1702304047162 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "calendar_excluded_keywords" (
          "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), 
          "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), 
          "user_id" uuid NOT NULL, 
          "keyword" character varying(255) NOT NULL, 
          "platform" character varying(255) NOT NULL, 
          "intitle" boolean NOT NULL DEFAULT false, 
          "indescription" boolean NOT NULL DEFAULT false
      );

      CREATE INDEX ON "calendar_excluded_keywords" ("user_id");
    `);
    await queryRunner.query(`
      CREATE TABLE "calendars" (
          "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), 
          "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), 
          "user_id" uuid NOT NULL, 
          "platform_account" character varying(255) NOT NULL, 
          "platform" character varying(255) NOT NULL, 
          "calendar_id" character varying(255) NOT NULL, 
          "summary" character varying(1000),
          "is_selected" boolean NOT NULL DEFAULT false
      );

      CREATE INDEX ON "calendars" ("user_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "calendars"');
    await queryRunner.query('DROP TABLE IF EXISTS "calendar_excluded_keywords"');
  }
}
