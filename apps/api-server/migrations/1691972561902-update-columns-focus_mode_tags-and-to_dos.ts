import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateColumnsFocusModeTagsAndToDos1691972561902 implements MigrationInterface {
  name = 'UpdateColumnsFocusModeTagsAndToDos1691972561902';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "to_do" ADD "external_task_id" character varying');
    await queryRunner.query('ALTER TABLE "to_do" ADD "external_task_metadata" jsonb');
    await queryRunner.query('ALTER TABLE "focus_mode_tags" ADD "external_project_id" character varying');
    await queryRunner.query('ALTER TABLE "focus_mode_tags" ADD "external_project_metadata" jsonb');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "focus_mode_tags" DROP COLUMN "external_project_metadata"');
    await queryRunner.query('ALTER TABLE "focus_mode_tags" DROP COLUMN "external_project_id"');
    await queryRunner.query('ALTER TABLE "to_do" DROP COLUMN "external_task_metadata"');
    await queryRunner.query('ALTER TABLE "to_do" DROP COLUMN "external_task_id"');
  }
}
