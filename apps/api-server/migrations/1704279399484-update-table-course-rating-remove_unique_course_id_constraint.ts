import { MigrationInterface, QueryRunner, TableUnique } from 'typeorm';

export class UpdateTableCourseRatingRemoveUniqueCourseIdConstraint1704279399484 implements MigrationInterface {
  name = 'UpdateTableCourseRatingRemoveUniqueCourseIdConstraint1704279399484';
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropUniqueConstraint('course_ratings', 'UQ_32b68ae69d8fb9200a854d6b331');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropUniqueConstraint('course_ratings', 'UQ_32b68ae69d8fb9200a854d6b331');
  }
}
