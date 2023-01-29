import { MigrationInterface, QueryRunner } from 'typeorm';

export class updateTableCourseRatingsAddLessonFk1672137326286 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "course_ratings" ADD COLUMN "lesson_id" UUID REFERENCES "lessons";

        CREATE INDEX ON "course_ratings" ("lesson_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "course_ratings" DROP COLUMN IF EXISTS "lesson_id";
    `);
  }
}
