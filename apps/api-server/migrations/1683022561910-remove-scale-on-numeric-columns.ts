import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveScaleOnNumericColumns1683022561910 implements MigrationInterface {
  name = 'RemoveScaleOnNumericColumns1683022561910';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "daily_stats" ALTER COLUMN "focus_modes_completed" TYPE numeric');
    await queryRunner.query('ALTER TABLE "daily_stats" ALTER COLUMN "created_at" SET DEFAULT NOW()');
    await queryRunner.query('ALTER TABLE "daily_stats" ALTER COLUMN "updated_at" SET DEFAULT NOW()');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "daily_stats" ALTER COLUMN "focus_modes_completed" TYPE numeric(2,2)');
  }
}
