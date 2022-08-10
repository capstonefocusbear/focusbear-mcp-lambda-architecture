import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateAllTimestampToTimestampz1660125759839 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "completed_activities" 
        ALTER COLUMN "start_time" TYPE TIMESTAMPTZ,
        ALTER COLUMN "finish_time" TYPE TIMESTAMPTZ
      ;
      ALTER TABLE "completed_activity_sequences" 
        ALTER COLUMN "start_time" TYPE TIMESTAMPTZ,
        ALTER COLUMN "finish_time" TYPE TIMESTAMPTZ
      ;
      ALTER TABLE "completed_focus_blocks" 
        ALTER COLUMN "start_time" TYPE TIMESTAMPTZ,
        ALTER COLUMN "finish_time" TYPE TIMESTAMPTZ,
        ALTER COLUMN "scheduled_finish_time" TYPE TIMESTAMPTZ
      ;
      ALTER TABLE "users" 
        ALTER COLUMN "current_focus_mode_finish_time" TYPE TIMESTAMPTZ
      ;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "completed_activities" 
        ALTER COLUMN "start_time" TYPE TIMESTAMP,
        ALTER COLUMN "finish_time" TYPE TIMESTAMP
      ;
      ALTER TABLE "completed_activity_sequences" 
        ALTER COLUMN "start_time" TYPE TIMESTAMP,
        ALTER COLUMN "finish_time" TYPE TIMESTAMP
      ;
      ALTER TABLE "completed_focus_blocks" 
        ALTER COLUMN "start_time" TYPE TIMESTAMP,
        ALTER COLUMN "finish_time" TYPE TIMESTAMP,
        ALTER COLUMN "scheduled_finish_time" TYPE TIMESTAMP
      ;
      ALTER TABLE "users" 
        ALTER COLUMN "current_focus_mode_finish_time" TYPE TIMESTAMP
      ;
    `);
  }
}
