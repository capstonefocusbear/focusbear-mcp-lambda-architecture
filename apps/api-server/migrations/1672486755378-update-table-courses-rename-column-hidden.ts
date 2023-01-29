import { MigrationInterface, QueryRunner } from 'typeorm';

export class updateTableCoursesRenameColumnHidden1672486755378 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "courses" RENAME COLUMN "hidden" TO "is_hidden"');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "courses" RENAME COLUMN "is_hidden" TO "hidden"');
  }
}
