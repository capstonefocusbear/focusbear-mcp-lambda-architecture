import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTableDailyStatsAddColumnsForMetrics1697091324866 implements MigrationInterface {
  name = 'UpdateTableDailyStatsAddColumnsForMetrics1697091324866';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "daily_stats" ADD "number_of_distractions_blocked" numeric NOT NULL DEFAULT \'0\'',
    );
    await queryRunner.query(
      'ALTER TABLE "daily_stats" ADD "seconds_spent_doing_breaks" numeric NOT NULL DEFAULT \'0\'',
    );
    await queryRunner.query(
      'ALTER TABLE "daily_stats" ADD "seconds_spent_in_focus_sessions" numeric NOT NULL DEFAULT \'0\'',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "daily_stats" DROP COLUMN "seconds_spent_in_focus_sessions"');
    await queryRunner.query('ALTER TABLE "daily_stats" DROP COLUMN "seconds_spent_doing_breaks"');
    await queryRunner.query('ALTER TABLE "daily_stats" DROP COLUMN "number_of_distractions_blocked"');
  }
}
