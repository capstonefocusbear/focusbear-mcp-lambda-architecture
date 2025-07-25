import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMicrobreaksFocusLeaderboardFields1753416600000 implements MigrationInterface {
  name = 'AddMicrobreaksFocusLeaderboardFields1753416600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add the new micro breaks and focus modes leaderboard day count fields to the users table
    await queryRunner.query(
      'ALTER TABLE "users" ADD "micro_breaks_number_days_completed" numeric NOT NULL DEFAULT \'0\'',
    );
    await queryRunner.query('ALTER TABLE "users" ADD "micro_breaks_num_days_of_stats" numeric NOT NULL DEFAULT \'0\'');
    await queryRunner.query(
      'ALTER TABLE "users" ADD "focus_modes_number_days_completed" numeric NOT NULL DEFAULT \'0\'',
    );
    await queryRunner.query('ALTER TABLE "users" ADD "focus_modes_num_days_of_stats" numeric NOT NULL DEFAULT \'0\'');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove the micro breaks and focus modes leaderboard day count fields from the users table
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN "focus_modes_num_days_of_stats"');
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN "focus_modes_number_days_completed"');
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN "micro_breaks_num_days_of_stats"');
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN "micro_breaks_number_days_completed"');
  }
}
