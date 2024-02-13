import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTableTrackEntityMakeUserIdNullable1707712838775 implements MigrationInterface {
  name = 'UpdateTableTrackEntityMakeUserIdNullable1707712838775';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "track_event" ALTER COLUMN "user_id" DROP NOT NULL');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "track_event" ALTER COLUMN "user_id" SET NOT NULL');
  }
}
