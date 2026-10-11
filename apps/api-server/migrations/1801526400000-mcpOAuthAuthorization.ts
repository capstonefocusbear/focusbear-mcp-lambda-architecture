import { MigrationInterface, QueryRunner } from 'typeorm';

// Login needs durable consent and single-use codes before task assignment work in #7.
export class McpOAuthAuthorization1801526400000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`CREATE TABLE mcp_oauth_grants (
      id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      client_id text NOT NULL, agent_label varchar(100) NOT NULL,
      scopes text[] NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), revoked_at timestamptz,
      CHECK (cardinality(scopes) > 0 AND scopes <@ ARRAY['mcp.tasks.read', 'mcp.tasks.write']::text[])
    )`);
    await runner.query('CREATE INDEX mcp_oauth_grants_user_client ON mcp_oauth_grants (user_id, client_id)');
    await runner.query(`CREATE TABLE mcp_oauth_handles (
      hash char(64) PRIMARY KEY, kind text NOT NULL, payload text NOT NULL, expires_at timestamptz NOT NULL
    )`);
    await runner.query('CREATE INDEX mcp_oauth_handles_expiry ON mcp_oauth_handles (expires_at)');
  }
  async down(runner: QueryRunner): Promise<void> {
    await runner.query('DROP TABLE mcp_oauth_handles');
    await runner.query('DROP TABLE mcp_oauth_grants');
  }
}
