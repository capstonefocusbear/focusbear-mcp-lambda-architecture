import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTableCourseRatingRemoveLessonId1703514895935 implements MigrationInterface {
  name = 'UpdateTableCourseRatingRemoveLessonId1703514895935';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "course_ratings" DROP COLUMN "lesson_id"');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "course_ratings" DROP COLUMN IF EXIST "lesson_id"');
  }
}
