import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTableTeamToAdminDeleteColumns1750263424648 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "team_to_admin" DROP COLUMN IF EXISTS "first_name";');
    await queryRunner.query('ALTER TABLE "team_to_admin" DROP COLUMN IF EXISTS "last_name";');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "team_to_admin" ADD COLUMN IF NOT EXISTS "first_name" varchar NULL;');
    await queryRunner.query('ALTER TABLE "team_to_admin" ADD COLUMN IF NOT EXISTS "last_name" varchar NULL;');
  }
}
