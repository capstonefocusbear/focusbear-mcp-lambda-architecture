import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnsureUserCurrentActivityFksNullable1773197891295 implements MigrationInterface {
  name = 'EnsureUserCurrentActivityFksNullable1773197891295';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "users" ALTER COLUMN "current_activity_sequence_id" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "users" ALTER COLUMN "last_completed_sequence_id" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "users" ALTER COLUMN "current_activity_id" DROP NOT NULL');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const [rowsWithNullPointers] = await queryRunner.query(`
      SELECT COUNT(*)::int AS count
      FROM "users"
      WHERE "current_activity_sequence_id" IS NULL
         OR "last_completed_sequence_id" IS NULL
         OR "current_activity_id" IS NULL
    `);

    if (rowsWithNullPointers?.count > 0) {
      throw new Error('Cannot restore NOT NULL on users current activity pointer columns while NULL values exist.');
    }

    await queryRunner.query('ALTER TABLE "users" ALTER COLUMN "current_activity_id" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "users" ALTER COLUMN "last_completed_sequence_id" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "users" ALTER COLUMN "current_activity_sequence_id" SET NOT NULL');
  }
}
