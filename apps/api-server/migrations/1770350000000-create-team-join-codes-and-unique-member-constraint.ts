import { MigrationInterface, QueryRunner } from 'typeorm';

export const transaction = false;

export class CreateTeamJoinCodesAndUniqueMemberConstraint1770350000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "team_join_codes" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "team_id" uuid NOT NULL,
        "code" character varying NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "max_redemptions" integer,
        "redemption_count" integer NOT NULL DEFAULT 0,
        "expires_at" TIMESTAMP WITH TIME ZONE,
        "created_by" uuid NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_team_join_codes_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_team_join_codes_team" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_team_join_codes_code" ON "team_join_codes" ("code");
      CREATE INDEX "IDX_team_join_codes_team_id" ON "team_join_codes" ("team_id");
    `);

    // Add partial unique index on team_to_member to prevent duplicate memberships (race condition fix)
    // Only applies where member_id is not null (unregistered invited users can have null member_id)
    await queryRunner.query(`
      CREATE UNIQUE INDEX CONCURRENTLY "IDX_team_to_member_team_id_member_id_unique"
      ON "team_to_member" ("team_id", "member_id")
      WHERE "member_id" IS NOT NULL;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_team_to_member_team_id_member_id_unique";
      DROP INDEX IF EXISTS "IDX_team_join_codes_team_id";
      DROP INDEX IF EXISTS "IDX_team_join_codes_code";
      DROP TABLE IF EXISTS "team_join_codes";
    `);
  }
}
