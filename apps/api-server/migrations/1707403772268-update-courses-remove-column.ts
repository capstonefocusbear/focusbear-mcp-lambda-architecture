import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateCoursesRemoveColumn1707403772268 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "courses" DROP COLUMN IF EXISTS "activity_id";
        DROP INDEX IF EXISTS "public"."IDX_9zHFdwZVB97hzYAGYCmY4Tuncc";
      `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "courses" ADD COLUMN "activity_id" uuid;
        CREATE INDEX "IDX_9zHFdwZVB97hzYAGYCmY4Tuncc" ON "courses" ("activity_id");
      `);
  }
}
