import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTableUsersAddColumnMicroBreaksStreak1709989057392 implements MigrationInterface {
  name = 'UpdateTableUsersAddColumnMicroBreaksStreak1709989057392';
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
                ALTER TABLE "users" ADD COLUMN "micro_breaks_streak" numeric DEFAULT 0;
              `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
                ALTER TABLE "users" DROP COLUMN IF EXISTS "micro_breaks_streak";
              `);
  }
}
