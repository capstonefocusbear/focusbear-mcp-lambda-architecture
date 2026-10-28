import { MigrationInterface, QueryRunner } from 'typeorm';

export class McpAuth0Agents1801526400002 implements MigrationInterface {
  public async up(runner: QueryRunner): Promise<void> {
    await runner.query(`CREATE TABLE mcp_agent_connections (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      issuer text NOT NULL, client_id text NOT NULL, display_name text NOT NULL, label text,
      status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled')),
      legacy_token_id uuid UNIQUE REFERENCES external_api_tokens(id) ON DELETE SET NULL,
      revocation_evidence text, revocation_status text NOT NULL DEFAULT 'none' CHECK (revocation_status IN ('none','pending','complete')),
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE(user_id,issuer,client_id), UNIQUE(id,user_id)
    )`);
    await runner.query(`INSERT INTO mcp_agent_connections (id,user_id,issuer,client_id,display_name,label,legacy_token_id,created_at)
      SELECT id,user_id,'legacy',id::text,COALESCE(agent_name,label,'Legacy agent'),label,id,created_at FROM external_api_tokens`);
    await runner.query(`ALTER TABLE to_do ADD COLUMN assigned_mcp_agent_id uuid,
      ADD CONSTRAINT to_do_mcp_agent_owner FOREIGN KEY (assigned_mcp_agent_id,user_id) REFERENCES mcp_agent_connections(id,user_id)`);
    await runner.query(`UPDATE to_do t SET assigned_mcp_agent_id=a.id FROM mcp_agent_connections a
      WHERE t.assigned_mcp_token_id=a.legacy_token_id AND t.user_id=a.user_id`);
    await runner.query(`CREATE INDEX IDX_to_do_assigned_mcp_agent_id ON to_do(assigned_mcp_agent_id)`);
    // The database enforces ownership for every assignment path, including existing bulk upserts.
    await runner.query(`CREATE FUNCTION enforce_mcp_assignment() RETURNS trigger LANGUAGE plpgsql AS $$
      DECLARE token_owner uuid; BEGIN
        IF TG_OP='UPDATE' AND NEW.assigned_mcp_agent_id IS DISTINCT FROM OLD.assigned_mcp_agent_id
          AND NEW.assigned_mcp_token_id IS NOT DISTINCT FROM OLD.assigned_mcp_token_id THEN
          NEW.assigned_mcp_token_id=NULL;
        END IF;
        IF NEW.assigned_mcp_token_id IS NOT NULL THEN
          SELECT user_id INTO token_owner FROM external_api_tokens WHERE id=NEW.assigned_mcp_token_id;
          IF token_owner IS DISTINCT FROM NEW.user_id THEN RAISE EXCEPTION 'MCP assignment owner mismatch'; END IF;
          IF TG_OP='INSERT' OR NEW.assigned_mcp_token_id IS DISTINCT FROM OLD.assigned_mcp_token_id THEN
            INSERT INTO mcp_agent_connections(id,user_id,issuer,client_id,display_name,label,legacy_token_id)
              SELECT id,user_id,'legacy',id::text,COALESCE(agent_name,label,'Legacy agent'),label,id FROM external_api_tokens WHERE id=NEW.assigned_mcp_token_id
              ON CONFLICT DO NOTHING;
            SELECT id INTO NEW.assigned_mcp_agent_id FROM mcp_agent_connections WHERE legacy_token_id=NEW.assigned_mcp_token_id;
          END IF;
        ELSIF TG_OP='UPDATE' AND OLD.assigned_mcp_token_id IS NOT NULL
          AND NEW.assigned_mcp_agent_id IS NOT DISTINCT FROM OLD.assigned_mcp_agent_id THEN
          NEW.assigned_mcp_agent_id=NULL;
        END IF;
        IF NEW.assigned_mcp_agent_id IS NOT NULL AND
          (TG_OP='INSERT' OR NEW.assigned_mcp_agent_id IS DISTINCT FROM OLD.assigned_mcp_agent_id) THEN
          IF NOT EXISTS (SELECT 1 FROM mcp_agent_connections WHERE id=NEW.assigned_mcp_agent_id AND user_id=NEW.user_id AND status='active') THEN
            RAISE EXCEPTION 'MCP assignment requires an owned active connection';
          END IF;
        END IF;
        RETURN NEW;
      END $$`);
    await runner.query(
      `CREATE TRIGGER mcp_assignment_owner BEFORE INSERT OR UPDATE ON to_do FOR EACH ROW EXECUTE FUNCTION enforce_mcp_assignment()`,
    );
  }
  public async down(_runner: QueryRunner): Promise<void> {
    throw new Error('MCP agent history is retained; roll back application configuration instead');
  }
}
