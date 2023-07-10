import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTableUsersAddRoutineNotificationFields1688470456090 implements MigrationInterface {
  name = 'UpdateTableUsersAddRoutineNotificationFields1688470456090';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "users" ADD "utc_startup_time" character varying(255)');
    await queryRunner.query('ALTER TABLE "users" ADD "utc_shutdown_time" character varying(255)');
    await queryRunner.query(
      'ALTER TABLE "users" ADD "routine_notification_times" jsonb NOT NULL DEFAULT \'{"last_time_notified_of_morning_routine":null,"last_time_notified_of_evening_routine":null}\'',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN "routine_notification_times"');
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN "utc_shutdown_time"');
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN "utc_startup_time"');
  }
}
