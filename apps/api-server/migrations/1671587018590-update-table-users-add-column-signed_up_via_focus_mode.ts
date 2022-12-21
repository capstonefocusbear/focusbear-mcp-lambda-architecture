import { MigrationInterface, QueryRunner } from 'typeorm';

export class updateTableUsersAddColumnSignedUpViaFocusMode1671587018590 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "users" ADD COLUMN "signed_up_via_focus_mode" UUID REFERENCES "focus_mode_templates";

        CREATE INDEX ON "users" ("signed_up_via_focus_mode");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "users" DROP COLUMN IF EXISTS "signed_up_via_focus_mode";
    `);
  }
}
