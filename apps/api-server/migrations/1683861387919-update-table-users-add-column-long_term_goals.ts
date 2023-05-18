import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTableUsersAddColumnLongTermGoals1683861387919 implements MigrationInterface {
  name = 'UpdateTableUsersAddColumnLongTermGoals1683861387919';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "users" ADD "long_term_goals" jsonb');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN "long_term_goals"');
  }
}
