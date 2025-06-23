import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTableTeamToMemberAddIndices1750080459360 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE INDEX "IDX_zriaxz223ikus58oc0pwgli9b8" ON "team_to_member" ("team_id")');
    await queryRunner.query('CREATE INDEX "IDX_4z5472st6c1jq1ix6yprjclh9w" ON "team_to_member" ("member_id")');
    await queryRunner.query('CREATE INDEX "IDX_nm1q170jaau0xd24ny7eawk17w" ON "team_to_member" ("email")');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "public"."IDX_zriaxz223ikus58oc0pwgli9b8"');
    await queryRunner.query('DROP INDEX "public"."IDX_4z5472st6c1jq1ix6yprjclh9w"');
    await queryRunner.query('DROP INDEX "public"."IDX_nm1q170jaau0xd24ny7eawk17w"');
  }
}
