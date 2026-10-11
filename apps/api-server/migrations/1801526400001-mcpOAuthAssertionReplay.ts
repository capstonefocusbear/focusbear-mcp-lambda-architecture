import { MigrationInterface, QueryRunner } from 'typeorm';

export class McpOAuthAssertionReplay1801526400001 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`CREATE TABLE mcp_oauth_assertions (
      hash char(64) PRIMARY KEY, expires_at timestamptz NOT NULL
    )`);
    await runner.query('CREATE INDEX mcp_oauth_assertions_expiry ON mcp_oauth_assertions (expires_at)');
  }
  async down(runner: QueryRunner): Promise<void> {
    await runner.query('DROP TABLE mcp_oauth_assertions');
  }
}
