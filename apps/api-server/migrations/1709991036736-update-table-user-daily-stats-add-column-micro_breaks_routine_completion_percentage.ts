import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTableUserDailyStatsAddColumnMicroBreaksRoutineCompletionPercentage1709991036736
  implements MigrationInterface
{
  name = 'UpdateTableUserDailyStatsAddColumnMicroBreaksRoutineCompletionPercentage1709991036736';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
                  ALTER TABLE "daily_stats" ADD COLUMN "micro_breaks_routine_completion_percentage" numeric DEFAULT 0;
                `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
                  ALTER TABLE "daily_stats" DROP COLUMN IF EXISTS "micro_breaks_routine_completion_percentage";
                `);
  }
}
