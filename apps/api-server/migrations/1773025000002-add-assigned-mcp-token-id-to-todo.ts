import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAssignedMcpTokenIdToTodo1773025000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "to_do"
      ADD COLUMN IF NOT EXISTS "assigned_mcp_token_id" uuid
        REFERENCES "external_api_tokens"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_to_do_assigned_mcp_token_id"
      ON "to_do" ("assigned_mcp_token_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_to_do_assigned_mcp_token_id";
    `);

    await queryRunner.query(`
      ALTER TABLE "to_do"
      DROP COLUMN IF EXISTS "assigned_mcp_token_id";
    `);
  }
}
