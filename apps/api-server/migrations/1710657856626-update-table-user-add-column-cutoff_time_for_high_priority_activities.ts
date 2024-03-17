import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTableUserAddColumnCutoffTimeForHighPriorityActivities1710657856626 implements MigrationInterface {
  name = 'UpdateTableUserAddColumnCutoffTimeForHighPriorityActivities1710657856626';
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
                  ALTER TABLE "users" ADD COLUMN "cutoff_time_for_high_priority_activities" character varying;
                `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
                  ALTER TABLE "users" DROP COLUMN IF EXISTS "cutoff_time_for_high_priority_activities";
                `);
  }
}
