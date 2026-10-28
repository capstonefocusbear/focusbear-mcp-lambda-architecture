import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { McpAuth0Service } from './mcp-auth0.service';

const verify = jest.fn();
const counts = new Map<string, number>();
const evalRedis = jest.fn(async (_script, _keys, key) => {
  const count = (counts.get(key) ?? 0) + 1;
  counts.set(key, count);
  return count;
});
jest.mock('@app/jwt/mcp-auth0', () => ({ loadMcpAuthConfig: jest.fn(), createMcpAuthVerifier: () => ({ verify }) }));
jest.mock('ioredis', () => ({
  __esModule: true,
  default: jest.fn(() => ({ eval: evalRedis, disconnect: jest.fn() })),
}));

describe('MCP backend verified identity', () => {
  let service: McpAuth0Service;
  let db: { query: jest.Mock };
  const identity = {
    subject: 'auth0|person',
    issuer: 'https://tenant/',
    clientId: 'approved',
    scopes: new Set(['mcp.tasks.read', 'openid']),
  };
  const enabled = process.env.MCP_AUTH0_ENABLED;
  beforeEach(() => {
    jest.clearAllMocks();
    counts.clear();
    process.env.MCP_AUTH0_ENABLED = 'true';
    verify.mockResolvedValue(identity);
    db = {
      query: jest.fn(async (sql) =>
        sql.startsWith('SELECT id FROM users')
          ? [{ id: 'user' }]
          : sql.startsWith('SELECT *')
          ? [{ id: 'agent', status: 'active' }]
          : [],
      ),
    };
    service = new McpAuth0Service(db as any);
  });
  afterEach(() => {
    service.onModuleDestroy();
    if (enabled === undefined) delete process.env.MCP_AUTH0_ENABLED;
    else process.env.MCP_AUTH0_ENABLED = enabled;
  });

  it('maps only verified subject/client, overwriting supplied user context and restricting scopes', async () => {
    const req: any = { mcpUserId: 'attacker', headers: { 'x-user-id': 'attacker', 'x-agent-id': 'other' } };
    await service.authenticate(req, 'jwt');
    expect(db.query).toHaveBeenCalledWith('SELECT id FROM users WHERE auth0_id = $1', ['auth0|person']);
    expect(req).toMatchObject({
      mcpUserId: 'user',
      mcpTokenId: 'agent',
      mcpScopes: ['mcp.tasks.read'],
      mcpAuthMode: 'auth0',
    });
  });
  it('denies unverified and unknown users before connecting', async () => {
    verify.mockRejectedValueOnce(new Error('signature'));
    await expect(service.authenticate({}, 'jwt')).rejects.toThrow(UnauthorizedException);
    expect(db.query).not.toHaveBeenCalled();
    db.query.mockResolvedValueOnce([]);
    await expect(service.authenticate({}, 'jwt')).rejects.toThrow('Unknown MCP user');
    expect(db.query).toHaveBeenCalledTimes(1);
  });
  it('never reactivates disabled connections on a fresh valid JWT', async () => {
    db.query.mockImplementation(async (sql) =>
      sql.startsWith('SELECT id FROM users')
        ? [{ id: 'user' }]
        : sql.startsWith('SELECT *')
        ? [{ id: 'agent', status: 'disabled' }]
        : [],
    );
    await expect(service.authenticate({}, 'jwt')).rejects.toThrow(ForbiddenException);
    expect(evalRedis).not.toHaveBeenCalled();
    expect(db.query.mock.calls.some(([sql]) => /UPDATE|DO UPDATE/.test(sql))).toBe(false);
  });
  it('shares the verified user budget across different client connections and denies request 61', async () => {
    for (let i = 0; i < 60; i++) {
      verify.mockResolvedValueOnce({ ...identity, clientId: `client-${i}` });
      // biome-ignore lint/performance/noAwaitInLoops: exercise the shared bucket sequentially through its rejection boundary.
      await service.authenticate({}, 'jwt');
    }
    await expect(service.authenticate({}, 'jwt')).rejects.toMatchObject({ status: 429 });
    expect(new Set(evalRedis.mock.calls.map((call) => call[2]))).toEqual(new Set(['mcp:user:user']));
    expect(evalRedis.mock.calls[0][0]).toContain('PEXPIRE');
  });
  it('fails closed when the shared limiter is unavailable', async () => {
    evalRedis.mockRejectedValueOnce(new Error('Redis unavailable'));
    const req = {};
    await expect(service.authenticate(req, 'jwt')).rejects.toThrow('Redis unavailable');
    expect(req).not.toHaveProperty('mcpUserId');
  });
});
