import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTeamToMemberMemberIdNullable1749817261431 implements MigrationInterface {
  name = 'UpdateTeamToMemberMemberIdNullable1749817261431';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "team_to_member" ALTER COLUMN "member_id" DROP NOT NULL;');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "team_to_member" ALTER COLUMN "member_id" SET NOT NULL;');
  }
}
