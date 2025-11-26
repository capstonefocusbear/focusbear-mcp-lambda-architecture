import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserContextFields1762401234567 implements MigrationInterface {
  name = 'AddUserContextFields1762401234567';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "users" ADD "user_job_details" text');
    await queryRunner.query('ALTER TABLE "users" ADD "user_typical_distractions" text');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN "user_typical_distractions"');
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN "user_job_details"');
  }
}
