import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTableCoursePlatformAddField1707310329336 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        CREATE TYPE "course_platforms" AS ENUM ('web','mac','win','ios','android'); 
        ALTER TABLE "courses" ADD COLUMN "platform" "course_platforms";
        CREATE INDEX "IDX_m6FzG2vfZZf9bQhgyJsPyzUDoQ" ON "courses" ("platform");
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "courses" DROP COLUMN IF EXISTS "platform";
        DROP TYPE IF EXISTS "course_platforms";
        DROP INDEX IF EXISTS "public"."IDX_m6FzG2vfZZf9bQhgyJsPyzUDoQ";
        `);
  }
}
