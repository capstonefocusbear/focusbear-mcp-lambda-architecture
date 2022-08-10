import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTableUsersAddAssociationWithTeam1659453324512 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN "member_of_team_id" UUID REFERENCES "teams" ON DELETE SET NULL ON UPDATE SET NULL,
        ADD COLUMN "owner_of_team_id" UUID REFERENCES "teams" ON DELETE SET NULL ON UPDATE SET NULL
      ;
    
      CREATE INDEX ON "users" ("member_of_team_id");
      CREATE INDEX ON "users" ("owner_of_team_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
        DROP COLUMN IF EXISTS "member_of_team_id",
        DROP COLUMN IF EXISTS "owner_of_team_id"
      ;
    `);
  }
}
