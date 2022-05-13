import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTableDevices1652436065989 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "operating_systems" AS ENUM ('MacOS', 'Windows', 'Android', 'iOS');

      CREATE TABLE "devices" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" UUID REFERENCES "users",
        "is_leader" BOOLEAN,
        "operating_system" "operating_systems",
        "metadata" JSONB,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );

      CREATE INDEX ON "devices" ("user_id");
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS "devices";
    `);
  }
}
