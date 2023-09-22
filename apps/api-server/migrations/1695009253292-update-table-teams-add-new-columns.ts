import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTableTeamsAddNewColumns1695009253292 implements MigrationInterface {
  name = 'UpdateTableTeamsAddNewColumns1695009253292';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "users" DROP CONSTRAINT "FK_3c961ad87ee0cde19655b01c61b"');
    await queryRunner.query('DROP INDEX "public"."IDX_bcd06c006e1f409075f80acb73"');
    await queryRunner.query('DROP INDEX "public"."IDX_3c961ad87ee0cde19655b01c61"');
    await queryRunner.query(
      'CREATE TABLE "users_admin_of_teams_teams" ("usersId" uuid NOT NULL, "teamsId" uuid NOT NULL, CONSTRAINT "PK_87a890352daf7639414062f37ad" PRIMARY KEY ("usersId", "teamsId"))',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_f956687d77a2537baf92ef0e8a" ON "users_admin_of_teams_teams" ("usersId") ',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_d45f10c83ae9e7cd5689b8388f" ON "users_admin_of_teams_teams" ("teamsId") ',
    );
    await queryRunner.query(
      'CREATE TABLE "users_member_of_teams_teams" ("usersId" uuid NOT NULL, "teamsId" uuid NOT NULL, CONSTRAINT "PK_534730f597fbd8c833f05118fb4" PRIMARY KEY ("usersId", "teamsId"))',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_577b6624ffc525f67b9e0f40f0" ON "users_member_of_teams_teams" ("usersId") ',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_e3b7fbec80cca84938f2e6c3fe" ON "users_member_of_teams_teams" ("teamsId") ',
    );
    await queryRunner.query('ALTER TABLE "users" DROP CONSTRAINT "UQ_3c961ad87ee0cde19655b01c61b"');
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN "owner_of_team_id"');
    await queryRunner.query('ALTER TABLE "teams" ADD "stripe_data" jsonb');

    await queryRunner.query('ALTER TABLE "teams" ALTER COLUMN "created_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "teams" ALTER COLUMN "updated_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "teams" DROP COLUMN "team_size"');
    await queryRunner.query('ALTER TABLE "teams" ADD "team_size" INTEGER NOT NULL DEFAULT 1');

    await queryRunner.query(
      'ALTER TABLE "users_admin_of_teams_teams" ADD CONSTRAINT "FK_f956687d77a2537baf92ef0e8a9" FOREIGN KEY ("usersId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "users_admin_of_teams_teams" ADD CONSTRAINT "FK_d45f10c83ae9e7cd5689b8388f3" FOREIGN KEY ("teamsId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "users_member_of_teams_teams" ADD CONSTRAINT "FK_577b6624ffc525f67b9e0f40f0b" FOREIGN KEY ("usersId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "users_member_of_teams_teams" ADD CONSTRAINT "FK_e3b7fbec80cca84938f2e6c3fe1" FOREIGN KEY ("teamsId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query('ALTER TABLE "teams" DROP CONSTRAINT IF EXISTS "FK_03655bd3d01df69022646faffd5"');
    await queryRunner.query('ALTER TABLE "teams" DROP CONSTRAINT "teams_owner_id_key"');
    await queryRunner.query(
      'ALTER TABLE "teams" ADD CONSTRAINT "FK_03655bd3d01df69022646faffd5" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
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
    await queryRunner.query('ALTER TABLE "teams" DROP COLUMN "team_size"');
    await queryRunner.query('ALTER TABLE "teams" ADD "team_size" integer NOT NULL DEFAULT \'1\'');
    await queryRunner.query('ALTER TABLE "teams" DROP COLUMN "stripe_data"');
    await queryRunner.query('ALTER TABLE "users" ADD "owner_of_team_id" uuid');
    await queryRunner.query(
      'ALTER TABLE "users" ADD CONSTRAINT "UQ_3c961ad87ee0cde19655b01c61b" UNIQUE ("owner_of_team_id")',
    );
    await queryRunner.query('DROP INDEX "public"."IDX_e3b7fbec80cca84938f2e6c3fe"');
    await queryRunner.query('DROP INDEX "public"."IDX_577b6624ffc525f67b9e0f40f0"');
    await queryRunner.query('DROP TABLE "users_member_of_teams_teams"');
    await queryRunner.query('DROP INDEX "public"."IDX_d45f10c83ae9e7cd5689b8388f"');
    await queryRunner.query('DROP INDEX "public"."IDX_f956687d77a2537baf92ef0e8a"');
    await queryRunner.query('DROP TABLE "users_admin_of_teams_teams"');
    await queryRunner.query('CREATE INDEX "IDX_3c961ad87ee0cde19655b01c61" ON "users" ("owner_of_team_id") ');
    await queryRunner.query('CREATE INDEX "IDX_bcd06c006e1f409075f80acb73" ON "users" ("member_of_team_id") ');
    await queryRunner.query(
      'ALTER TABLE "users" ADD CONSTRAINT "FK_3c961ad87ee0cde19655b01c61b" FOREIGN KEY ("owner_of_team_id") REFERENCES "teams"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query('ALTER TABLE "teams" DROP CONSTRAINT "FK_03655bd3d01df69022646faffd5"');
    await queryRunner.query('ALTER TABLE "teams" ADD CONSTRAINT "teams_owner_id_key" UNIQUE ("owner_id")');
    await queryRunner.query(
      'ALTER TABLE "teams" ADD CONSTRAINT "FK_03655bd3d01df69022646faffd5" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
  }
}
