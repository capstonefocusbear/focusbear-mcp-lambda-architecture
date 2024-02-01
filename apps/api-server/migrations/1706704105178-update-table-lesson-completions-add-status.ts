import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTableLessonCompletionsAddStatus1706704105178 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "lesson-completions" ADD COLUMN "status" VARCHAR(255);
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
           ALTER TABLE "lesson-completions" DROP COLUMN IF EXISTS "status";
        `);
  }
}
