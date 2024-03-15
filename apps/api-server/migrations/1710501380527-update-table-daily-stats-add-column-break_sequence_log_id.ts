import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTableDailyStatsAddColumnBreakSequenceLogId1710501380527 implements MigrationInterface {
  name = 'UpdateTableDailyStatsAddColumnBreakSequenceLogId1710501380527';
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
                      ALTER TABLE "daily_stats" ADD COLUMN "break_sequence_log_id" numeric DEFAULT 0;
                    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
                      ALTER TABLE "daily_stats" DROP COLUMN IF EXISTS "break_sequence_log_id";
                    `);
  }
}
