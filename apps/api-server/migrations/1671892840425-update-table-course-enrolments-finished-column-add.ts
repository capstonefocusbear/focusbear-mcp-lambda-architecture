import { MigrationInterface, QueryRunner } from 'typeorm';

export class updateTableCourseEnrolmentFinishedColumnAdd1671888452823 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "course_enrolments" ADD COLUMN "finished" BOOLEAN DEFAULT FALSE');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "course_enrolments" DROP COLUMN IF EXISTS "finished"');
  }
}
