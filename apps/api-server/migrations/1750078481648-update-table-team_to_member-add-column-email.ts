import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTableTeamToMemberAddColumnEmail1750078481648 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "team_to_member" ADD COLUMN IF NOT EXISTS "email" varchar NULL;');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "team_to_member" DROP COLUMN IF EXISTS "email";');
  }
}
