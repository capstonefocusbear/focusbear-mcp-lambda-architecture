import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateCalendarTable1703017088905 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        DROP TABLE IF EXISTS "calendars";
        CREATE TABLE "calendars" (
            "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), 
            "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), 
            "user_id" uuid NOT NULL, 
            "platform_account" character varying(255) NOT NULL, 
            "platform" character varying(255) NOT NULL, 
            "calendar_id" character varying(255) NOT NULL, 
            "summary" character varying(1000),
            "is_selected" BOOLEAN NOT NULL DEFAULT 'false'
        );

        CREATE INDEX ON "calendars" ("user_id");
       `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "calendars"');
  }
}
