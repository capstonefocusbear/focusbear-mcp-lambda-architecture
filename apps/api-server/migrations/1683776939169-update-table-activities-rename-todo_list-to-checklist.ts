import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTableActivitiesRenameTodoListToChecklist1683776939169 implements MigrationInterface {
  name = 'UpdateTableActivitiesRenameTodoListToChecklist1683776939169';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "activity_template" RENAME COLUMN "todo_list" TO "check_list"');
    await queryRunner.query('ALTER TABLE "activities" RENAME COLUMN "todo_list" TO "check_list"');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "activities" RENAME COLUMN "check_list" TO "todo_list"');
    await queryRunner.query('ALTER TABLE "activity_template" RENAME COLUMN "check_list" TO "todo_list"');
  }
}
