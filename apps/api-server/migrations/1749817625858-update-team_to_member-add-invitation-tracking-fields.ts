import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTeamToMemberAddInvitationTrackingFields1749817625858 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "team_to_member"
        ADD COLUMN IF NOT EXISTS "invitation_status" VARCHAR(20) NOT NULL DEFAULT 'pending',
        ADD COLUMN IF NOT EXISTS "invitation_sent_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        ADD COLUMN IF NOT EXISTS "invitation_responded_at" TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS "invitation_send_count" INTEGER NOT NULL DEFAULT 0;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "team_to_member"
        DROP COLUMN IF EXISTS "invitation_status",
        DROP COLUMN IF EXISTS "invitation_sent_at",
        DROP COLUMN IF EXISTS "invitation_responded_at",
        DROP COLUMN IF EXISTS "invitation_send_count";
    `);
  }
}
