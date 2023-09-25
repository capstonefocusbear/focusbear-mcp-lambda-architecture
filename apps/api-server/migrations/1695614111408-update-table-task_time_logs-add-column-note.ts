import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTableTaskTimeLogsAddColumnNote1695614111408 implements MigrationInterface {
  name = 'UpdateTableTaskTimeLogsAddColumnNote1695614111408';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "tasks_time_logs" ADD "note" character varying');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "tasks_time_logs" DROP COLUMN "note"');
  }
}
