import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTableActivitiesAddColumnTodoList1683198706286 implements MigrationInterface {
  name = 'UpdateTableActivitiesAddColumnTodoList1683198706286';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "activities" ADD "todo_list" jsonb');
    await queryRunner.query('ALTER TABLE "activity_template" ADD "todo_list" jsonb');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "activities" DROP COLUMN "todo_list"');
    await queryRunner.query('ALTER TABLE "activity_template" DROP COLUMN "todo_list"');
  }
}
