import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTableUsersAddCurrentCompletingFocusBlock1655980346118 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN "current_completing_focus_block_id" UUID REFERENCES "completed_focus_blocks"
      ;

      CREATE INDEX ON "users" ("current_completing_focus_block_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
        DROP COLUMN IF EXISTS "current_completing_focus_block_id"
      ;
    `);
  }
}
