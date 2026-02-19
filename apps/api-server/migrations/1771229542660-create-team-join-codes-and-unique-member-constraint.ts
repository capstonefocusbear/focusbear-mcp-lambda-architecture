import { MigrationInterface, QueryRunner } from 'typeorm';

export const transaction = 'none';

export class CreateTeamJoinCodesAndUniqueMemberConstraint1771229542660 implements MigrationInterface {
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

    await queryRunner.query('CREATE UNIQUE INDEX "IDX_team_join_codes_code" ON "team_join_codes" ("code")');
    await queryRunner.query('CREATE INDEX "IDX_team_join_codes_team_id" ON "team_join_codes" ("team_id")');

    // Remove historical duplicate memberships before adding the unique index.
    // Keep one canonical record per (team_id, member_id), preferring accepted rows.
    await queryRunner.query(`
      WITH ranked AS (
        SELECT
          id,
          ROW_NUMBER() OVER (
            PARTITION BY team_id, member_id
            ORDER BY
              CASE WHEN invitation_status = 'accepted' THEN 0 ELSE 1 END,
              invitation_responded_at DESC NULLS LAST,
              updated_at DESC NULLS LAST,
              created_at ASC,
              id ASC
          ) AS row_rank
        FROM team_to_member
        WHERE member_id IS NOT NULL
      )
      DELETE FROM team_to_member AS ttm
      USING ranked
      WHERE ttm.id = ranked.id
        AND ranked.row_rank > 1;
    `);

    // Add partial unique index on team_to_member to prevent duplicate memberships (race condition fix)
    // Only applies where member_id is not null (unregistered invited users can have null member_id)
    await queryRunner.query(`
      CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "IDX_team_to_member_team_id_member_id_unique"
      ON "team_to_member" ("team_id", "member_id")
      WHERE "member_id" IS NOT NULL;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX CONCURRENTLY IF EXISTS "IDX_team_to_member_team_id_member_id_unique"');
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_team_join_codes_team_id"');
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_team_join_codes_code"');
    await queryRunner.query('DROP TABLE IF EXISTS "team_join_codes"');
  }
}
