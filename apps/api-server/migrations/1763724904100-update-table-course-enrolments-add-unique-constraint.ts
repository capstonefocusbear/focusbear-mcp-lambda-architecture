import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTableCourseEnrolmentsAddUniqueConstraint1763724904100 implements MigrationInterface {
  name = 'UpdateTableCourseEnrolmentsAddUniqueConstraint1763724904100';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "course_enrolments" ADD CONSTRAINT "UQ_course_enrolments_user_id_course_id" UNIQUE ("user_id", "course_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "course_enrolments" DROP CONSTRAINT "UQ_course_enrolments_user_id_course_id";
    `);
  }
}
