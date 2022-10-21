import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTableHabitPacks1664501342178 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        CREATE TYPE "habit_pack_types" AS ENUM ('routine', 'standalone');

        CREATE TABLE "habit_packs" (
          "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          "user_id" UUID REFERENCES "users",
          "pack_type" "habit_pack_types",
          "pack_name" VARCHAR(255),
          "description" VARCHAR(255),
          "description_video_url" VARCHAR(255),
          "welcome_message" VARCHAR(255),
          "welcome_video_url" VARCHAR(255),
          "marketplace_approval_status" BOOLEAN DEFAULT false,
          "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );
  
        CREATE INDEX ON "habit_packs" ("user_id");
      `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP TYPE "habit_pack_types";
            DROP TABLE IF EXISTS "habit_packs";
      `);
  }
}
