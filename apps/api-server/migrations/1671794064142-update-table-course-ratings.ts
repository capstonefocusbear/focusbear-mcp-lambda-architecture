import { MigrationInterface, QueryRunner } from 'typeorm';

export class updateTableCourseRatings1671794064142 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "course_ratings" ADD COLUMN "review" VARCHAR(500)');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "course_ratings" DROP COLUMN "review"');
  }
}
