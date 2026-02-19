import { MigrationInterface, QueryRunner } from 'typeorm';

export class updateProjectMemberInvitationStatusAddFailed1771515000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE "project_member_invitation_status_enum" ADD VALUE 'failed';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "project_members"
      SET "invitation_status" = 'pending'
      WHERE "invitation_status" = 'failed';
    `);

    await queryRunner.query(`
      ALTER TYPE "project_member_invitation_status_enum" RENAME TO "project_member_invitation_status_enum_old";
    `);

    await queryRunner.query(`
      CREATE TYPE "project_member_invitation_status_enum" AS ENUM('pending', 'accepted', 'declined');
    `);

    await queryRunner.query(`
      ALTER TABLE "project_members"
      ALTER COLUMN "invitation_status" TYPE "project_member_invitation_status_enum"
      USING "invitation_status"::text::"project_member_invitation_status_enum";
    `);

    await queryRunner.query(`
      DROP TYPE "project_member_invitation_status_enum_old";
    `);
  }
}
