import { MigrationInterface, QueryRunner } from 'typeorm';

export class updateTableUsersAddColumnCutoffTimeForStandardPriorityActivities1673854128083
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "users" ADD COLUMN "cutoff_time_for_standard_priority_activities" character varying;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "users" DROP COLUMN IF EXISTS "cutoff_time_for_standard_priority_activities";
    `);
  }
}
