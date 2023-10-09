import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTableToDoAddColumnSubtasks1696737136664 implements MigrationInterface {
  name = 'UpdateTableToDoAddColumnSubtasks1696737136664';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "to_do" ADD "subtasks" jsonb');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "to_do" DROP COLUMN "subtasks"');
  }
}
