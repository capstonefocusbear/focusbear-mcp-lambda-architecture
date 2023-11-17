import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropOldTeamsTables1700124376704 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "users_member_of_teams_teams" DROP CONSTRAINT "FK_e3b7fbec80cca84938f2e6c3fe1"',
    );
    await queryRunner.query(
      'ALTER TABLE "users_member_of_teams_teams" DROP CONSTRAINT "FK_577b6624ffc525f67b9e0f40f0b"',
    );
    await queryRunner.query(
      'ALTER TABLE "users_admin_of_teams_teams" DROP CONSTRAINT "FK_d45f10c83ae9e7cd5689b8388f3"',
    );
    await queryRunner.query(
      'ALTER TABLE "users_admin_of_teams_teams" DROP CONSTRAINT "FK_f956687d77a2537baf92ef0e8a9"',
    );
    await queryRunner.query('DROP TABLE IF EXISTS "users_member_of_teams_teams"');
    await queryRunner.query('DROP TABLE IF EXISTS "users_admin_of_teams_teams"');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE TABLE "users_member_of_teams_teams" ("usersId" uuid NOT NULL, "teamsId" uuid NOT NULL, CONSTRAINT "PK_534730f597fbd8c833f05118fb4" PRIMARY KEY ("usersId", "teamsId"))',
    );
    await queryRunner.query(
      'CREATE TABLE "users_admin_of_teams_teams" ("usersId" uuid NOT NULL, "teamsId" uuid NOT NULL, CONSTRAINT "PK_87a890352daf7639414062f37ad" PRIMARY KEY ("usersId", "teamsId"))',
    );
    await queryRunner.query(
      'ALTER TABLE "users_member_of_teams_teams" ADD CONSTRAINT "FK_577b6624ffc525f67b9e0f40f0b" FOREIGN KEY ("usersId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "users_admin_of_teams_teams" ADD CONSTRAINT "FK_f956687d77a2537baf92ef0e8a9" FOREIGN KEY ("usersId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "users_admin_of_teams_teams" ADD CONSTRAINT "FK_d45f10c83ae9e7cd5689b8388f3" FOREIGN KEY ("teamsId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_577b6624ffc525f67b9e0f40f0" ON "users_member_of_teams_teams" ("usersId") ',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_e3b7fbec80cca84938f2e6c3fe" ON "users_member_of_teams_teams" ("teamsId") ',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_f956687d77a2537baf92ef0e8a" ON "users_admin_of_teams_teams" ("usersId") ',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_d45f10c83ae9e7cd5689b8388f" ON "users_admin_of_teams_teams" ("teamsId") ',
    );
    await queryRunner.query(
      'ALTER TABLE "users_member_of_teams_teams" ADD CONSTRAINT "FK_e3b7fbec80cca84938f2e6c3fe1" FOREIGN KEY ("teamsId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
  }
}
