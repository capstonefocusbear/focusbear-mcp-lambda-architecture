import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTableUsers1652433139004 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "auth0_id" VARCHAR(255) NOT NULL UNIQUE,
        "email" VARCHAR(255) NOT NULL UNIQUE,
        "first_name" VARCHAR(255),
        "startup_time" VARCHAR(255),
        "shutdown_time" VARCHAR(255),
        "break_after_minutes" INT,
        "current_focus_mode_finish_time" TIMESTAMP,
        "password_for_settings" VARCHAR(255),
        "is_office_mode_activated" BOOLEAN,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS "users";
    `);
  }
}
