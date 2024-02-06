import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateCourseAddColumnActivityId1707228891009 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "courses" ADD COLUMN "activity_id" uuid DEFAULT NULL`);
    await queryRunner.query('CREATE INDEX "IDX_9zHFdwZVB97hzYAGYCmY4Tuncc" ON "courses" ("activity_id")');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "courses" DROP COLUMN IF EXISTS "activity_id"`);
    await queryRunner.query('DROP INDEX IF EXISTS "public"."IDX_9zHFdwZVB97hzYAGYCmY4Tuncc"');
  }
}
