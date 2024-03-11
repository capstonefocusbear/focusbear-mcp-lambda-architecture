import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTableActivityAddColumnCutoffTimeForDoingActivity1709925044810 implements MigrationInterface {
  name = 'UpdateTableActivityAddColumnCutoffTimeForDoingActivity1709925044810';
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
                ALTER TABLE "activities" ADD COLUMN "cutoff_time_for_doing_activity" character varying;
              `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
                ALTER TABLE "activities" DROP COLUMN IF EXISTS "cutoff_time_for_doing_activity";
              `);
  }
}
