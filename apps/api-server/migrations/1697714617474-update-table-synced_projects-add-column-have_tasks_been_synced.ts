import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTableSyncedProjectsAddColumnHaveTasksBeenSynced1697714617474 implements MigrationInterface {
  name = 'UpdateTableSyncedProjectsAddColumnHaveTasksBeenSynced1697714617474';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "synced_projects" ADD "have_tasks_been_synced" boolean NOT NULL DEFAULT false',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "synced_projects" DROP COLUMN "have_tasks_been_synced"');
  }
}
