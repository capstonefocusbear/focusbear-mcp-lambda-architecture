import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLeaderboardDayCountFields1753161000000 implements MigrationInterface {
  name = 'AddLeaderboardDayCountFields1753161000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add the new leaderboard day count fields to the users table
    await queryRunner.query('ALTER TABLE "users" ADD "morning_number_days_completed" numeric NOT NULL DEFAULT \'0\'');
    await queryRunner.query('ALTER TABLE "users" ADD "morning_num_days_of_stats" numeric NOT NULL DEFAULT \'0\'');
    await queryRunner.query('ALTER TABLE "users" ADD "evening_number_days_completed" numeric NOT NULL DEFAULT \'0\'');
    await queryRunner.query('ALTER TABLE "users" ADD "evening_num_days_of_stats" numeric NOT NULL DEFAULT \'0\'');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove the leaderboard day count fields from the users table
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN "evening_num_days_of_stats"');
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN "evening_number_days_completed"');
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN "morning_num_days_of_stats"');
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN "morning_number_days_completed"');
  }
}
