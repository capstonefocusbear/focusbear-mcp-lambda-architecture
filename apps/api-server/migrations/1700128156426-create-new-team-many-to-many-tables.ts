import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNewTeamManyToManyTables1700128156426 implements MigrationInterface {
  name = 'CreateNewTeamManyToManyTables1700128156426';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE TABLE "team_to_member" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), "team_id" uuid NOT NULL, "member_id" uuid NOT NULL, "first_name" character varying, "last_name" character varying, "member_expiry_date" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_693d09dbfeace0e6ac4c1736953" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'CREATE TABLE "team_to_admin" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), "team_id" uuid NOT NULL, "admin_id" uuid NOT NULL, "first_name" character varying, "last_name" character varying, CONSTRAINT "PK_70b2af2fb5f79db6e586e0887b9" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'ALTER TABLE "team_to_member" ADD CONSTRAINT "FK_3a5cc03baa6d3810061dddb7664" FOREIGN KEY ("member_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "team_to_member" ADD CONSTRAINT "FK_cbcb9374715cdb035bc7d91467f" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "team_to_admin" ADD CONSTRAINT "FK_86ea78519f21e28e773feb7761c" FOREIGN KEY ("admin_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "team_to_admin" ADD CONSTRAINT "FK_47d7953a3762e15cbca1b329b6d" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "team_to_admin" DROP CONSTRAINT "FK_47d7953a3762e15cbca1b329b6d"');
    await queryRunner.query('ALTER TABLE "team_to_admin" DROP CONSTRAINT "FK_86ea78519f21e28e773feb7761c"');
    await queryRunner.query('ALTER TABLE "team_to_member" DROP CONSTRAINT "FK_cbcb9374715cdb035bc7d91467f"');
    await queryRunner.query('ALTER TABLE "team_to_member" DROP CONSTRAINT "FK_3a5cc03baa6d3810061dddb7664"');
    await queryRunner.query('DROP TABLE "team_to_admin"');
    await queryRunner.query('DROP TABLE "team_to_member"');
  }
}
