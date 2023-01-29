import { MigrationInterface, QueryRunner } from 'typeorm';

export class updateTableCourseFinishedColumnDropped1671888802178 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "courses" DROP COLUMN "finished"');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "courses" DROP COLUMN IF EXISTS "finished"');
  }
}
