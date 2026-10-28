/** Real PostgreSQL acceptance: explicit disposable, loopback-only DB; never a production connection. */
import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { McpAuth0Agents1801526400002 } from '../migrations/1801526400002-mcpAuth0Agents';
import { McpAuth0Service } from '../src/modules/external-mcp_fffff/services/mcp-auth0.service';
import { McpConnectionsService } from '../src/modules/external-mcp_fffff/services/mcp-connections.service';

const databaseUrl = process.env.MCP_DATABASE_TEST_URL;
const databaseTests = databaseUrl ? describe : describe.skip;

databaseTests('MCP agent migration and durable authorization (PostgreSQL)', () => {
  const schema = `mcp_test_${randomUUID().replace(/-/g, '')}`;
  let admin: DataSource;
  let db: DataSource;
  let auth: McpAuth0Service;
  let connections: McpConnectionsService;
  const user = randomUUID();
  const other = randomUUID();
  const legacy = randomUUID();
  const task = randomUUID();

  beforeAll(async () => {
    const target = new URL(databaseUrl);
    if (
      !['localhost', '127.0.0.1', '[::1]'].includes(target.hostname) ||
      !['postgres:', 'postgresql:'].includes(target.protocol)
    ) {
      throw new Error('MCP_DATABASE_TEST_URL must point to a disposable loopback PostgreSQL database');
    }
    admin = await new DataSource({ type: 'postgres', url: databaseUrl, entities: [] }).initialize();
    await admin.query(`CREATE SCHEMA "${schema}"`);
    db = await new DataSource({
      type: 'postgres',
      url: databaseUrl,
      entities: [],
      extra: { options: `-c search_path=${schema},public`, max: 10 },
    }).initialize();
    await db.query('CREATE TABLE users (id uuid PRIMARY KEY, auth0_id text UNIQUE)');
    await db.query(`CREATE TABLE external_api_tokens (id uuid PRIMARY KEY, user_id uuid REFERENCES users(id),
      agent_name text,label text,created_at timestamptz DEFAULT now())`);
    await db.query(`CREATE TABLE to_do (id uuid PRIMARY KEY,user_id uuid REFERENCES users(id),
      assigned_mcp_token_id uuid REFERENCES external_api_tokens(id) ON DELETE SET NULL)`);
    await db.query('INSERT INTO users VALUES ($1,$2),($3,$4)', [user, 'auth0|owner', other, 'auth0|other']);
    await db.query('INSERT INTO external_api_tokens(id,user_id,agent_name,label) VALUES($1,$2,$3,$4)', [
      legacy,
      user,
      'Existing named agent',
      'Legacy label',
    ]);
    await db.query('INSERT INTO to_do VALUES($1,$2,$3)', [task, user, legacy]);
    const runner = db.createQueryRunner();
    await runner.connect();
    try {
      await new McpAuth0Agents1801526400002().up(runner);
    } finally {
      await runner.release();
    }
    auth = new McpAuth0Service(db);
    connections = new McpConnectionsService(db);
  }, 30000);

  afterAll(async () => {
    auth?.onModuleDestroy();
    if (db?.isInitialized) await db.destroy();
    if (admin?.isInitialized) {
      await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await admin.destroy();
    }
  });

  it('backfills stable identities without changing legacy names or assignment IDs', async () => {
    const [row] = await db.query('SELECT * FROM mcp_agent_connections WHERE legacy_token_id=$1', [legacy]);
    expect(row).toMatchObject({
      id: legacy,
      user_id: user,
      display_name: 'Existing named agent',
      label: 'Legacy label',
    });
    const [assigned] = await db.query('SELECT assigned_mcp_token_id,assigned_mcp_agent_id FROM to_do WHERE id=$1', [
      task,
    ]);
    expect(assigned).toEqual({ assigned_mcp_token_id: legacy, assigned_mcp_agent_id: legacy });
  });

  it('concurrent first calls create exactly one identity per user/issuer/client', async () => {
    const agents = await Promise.all(
      Array.from({ length: 10 }, () => auth.resolveConnection(user, 'https://issuer.example/', 'approved')),
    );
    expect(new Set(agents.map((agent) => agent.id)).size).toBe(1);
    const [{ count }] = await db.query('SELECT count(*) FROM mcp_agent_connections WHERE user_id=$1 AND client_id=$2', [
      user,
      'approved',
    ]);
    expect(Number(count)).toBe(1);
    const isolated = await auth.resolveConnection(other, 'https://issuer.example/', 'approved');
    expect(isolated.id).not.toBe(agents[0].id);
  });

  it('never silently reactivates a disconnected identity', async () => {
    const agent = await auth.resolveConnection(user, 'https://issuer.example/', 'disabled-client');
    await connections.disconnect(user, agent.id);
    await expect(auth.resolveConnection(user, 'https://issuer.example/', 'disabled-client')).rejects.toThrow();
    await expect(connections.reconnect(user, agent.id)).rejects.toThrow();
  });

  it('rejects cross-user and disabled assignments at the database boundary', async () => {
    const agent = await auth.resolveConnection(other, 'https://issuer.example/', 'foreign');
    await expect(
      db.query('INSERT INTO to_do(id,user_id,assigned_mcp_agent_id) VALUES($1,$2,$3)', [randomUUID(), user, agent.id]),
    ).rejects.toThrow();
    await connections.disconnect(other, agent.id);
    await expect(
      db.query('INSERT INTO to_do(id,user_id,assigned_mcp_agent_id) VALUES($1,$2,$3)', [randomUUID(), other, agent.id]),
    ).rejects.toThrow();
  });

  it('links only by explicit owner action and preserves the old credential history', async () => {
    const agent = await auth.resolveConnection(user, 'https://issuer.example/', 'linked-client');
    await connections.link(user, legacy, agent.id);
    const [assigned] = await db.query('SELECT assigned_mcp_token_id,assigned_mcp_agent_id FROM to_do WHERE id=$1', [
      task,
    ]);
    expect(assigned).toEqual({ assigned_mcp_token_id: null, assigned_mcp_agent_id: agent.id });
    const [old] = await db.query('SELECT agent_name FROM external_api_tokens WHERE id=$1', [legacy]);
    expect(old.agent_name).toBe('Existing named agent');
  });

  it('renames legacy connections consistently in the dashboard token model', async () => {
    await connections.rename(user, legacy, 'User renamed agent');
    const [old] = await db.query('SELECT agent_name FROM external_api_tokens WHERE id=$1', [legacy]);
    const [agent] = await db.query('SELECT display_name FROM mcp_agent_connections WHERE id=$1', [legacy]);
    expect(old.agent_name).toBe('User renamed agent');
    expect(agent.display_name).toBe('User renamed agent');
  });

  it('requires current administrative evidence before explicit user reconnect', async () => {
    const agent = await auth.resolveConnection(user, 'https://issuer.example/', 'revocation-client');
    await connections.disconnect(user, agent.id);
    const pending = (await connections.pendingRevocations()).find((row) => row.id === agent.id);
    await expect(
      connections.confirmRevocation(agent.id, '2000-01-01T00:00:00.000000Z', 'stale evidence'),
    ).rejects.toThrow();
    await connections.confirmRevocation(agent.id, pending.revision, 'Synthetic test revocation evidence');
    await connections.reconnect(user, agent.id);
    await expect(auth.resolveConnection(user, 'https://issuer.example/', 'revocation-client')).resolves.toMatchObject({
      id: agent.id,
    });
  });

  it('allows the owner to assign an OAuth agent and prevents foreign linking', async () => {
    const agent = await auth.resolveConnection(user, 'https://issuer.example/', 'assignment');
    const newTask = randomUUID();
    await db.query('INSERT INTO to_do(id,user_id,assigned_mcp_agent_id) VALUES($1,$2,$3)', [newTask, user, agent.id]);
    const [row] = await db.query('SELECT assigned_mcp_agent_id FROM to_do WHERE id=$1', [newTask]);
    expect(row.assigned_mcp_agent_id).toBe(agent.id);
    await expect(connections.link(other, legacy, agent.id)).rejects.toThrow();
  });
});
