import { McpConnectionsService } from './mcp-connections.service';

describe('MCP connection management', () => {
  const query = jest.fn();
  const db = { query, transaction: async (callback) => callback({ query }) };
  const service = new McpConnectionsService(db as any);
  beforeEach(() => jest.resetAllMocks());
  it('commits disabled plus pending before reporting disconnect', async () => {
    query.mockResolvedValueOnce([{ id: 'agent' }]);
    await expect(service.disconnect('owner', 'agent')).resolves.toEqual({
      status: 'disabled',
      revocation_status: 'pending',
    });
    expect(query).toHaveBeenCalledWith(expect.stringContaining("status='disabled'"), ['owner', 'agent']);
    expect(query.mock.calls[0][0]).toContain("revocation_status='pending'");
  });
  it('denies disconnect and rename for absent or foreign connection', async () => {
    query.mockResolvedValue([]);
    await expect(service.disconnect('stranger', 'agent')).rejects.toThrow('Connection not found');
    await expect(service.rename('stranger', 'agent', 'Renamed')).rejects.toThrow('Connection not found');
  });
  it('only reconnects an owned connection whose revocation is no longer pending, atomically', async () => {
    query.mockResolvedValueOnce([]);
    await expect(service.reconnect('owner', 'agent')).rejects.toThrow('completed revocation');
    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0][0]).toContain("revocation_status <> 'pending'");
    query.mockResolvedValueOnce([{ id: 'agent' }]);
    await expect(service.reconnect('owner', 'agent')).resolves.toBeUndefined();
  });
  it('links only owned legacy token and owned active target, removing old token authorization', async () => {
    query
      .mockResolvedValueOnce([{ id: 'agent' }])
      .mockResolvedValueOnce([{ id: 'token' }])
      .mockResolvedValueOnce([]);
    await service.link('owner', 'token', 'agent');
    expect(query.mock.calls[0][0]).toContain("status='active' FOR UPDATE");
    expect(query.mock.calls[1][1]).toEqual(['owner', 'token']);
    expect(query.mock.calls[2][0]).toContain('assigned_mcp_token_id=NULL');
    expect(query.mock.calls[2][1]).toEqual(['owner', 'token', 'agent']);
  });
  it('does not move tasks when either owned connection is absent', async () => {
    query.mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: 'token' }]);
    await expect(service.link('stranger', 'token', 'agent')).rejects.toThrow('Owned connection not found');
    expect(query).toHaveBeenCalledTimes(2);
  });
  it('records evidence only for the exact pending disconnect revision', async () => {
    query.mockResolvedValueOnce([]);
    await expect(service.confirmRevocation('agent', '2026-10-25T00:00:00.123456Z', 'Audit ticket 123')).rejects.toThrow(
      'No pending revocation',
    );
    expect(query.mock.calls[0][0]).toContain('updated_at=$2::timestamptz');
    expect(query.mock.calls[0][1]).toEqual(['agent', '2026-10-25T00:00:00.123456Z', 'Audit ticket 123']);
  });
  it('renames a legacy agent in both durable identity and legacy dashboard token atomically', async () => {
    query.mockResolvedValueOnce([{ id: 'agent', legacy_token_id: 'token' }]).mockResolvedValueOnce([]);
    await service.rename('owner', 'agent', 'New name');
    expect(query).toHaveBeenCalledTimes(2);
    expect(query.mock.calls[1]).toEqual([
      expect.stringContaining('UPDATE external_api_tokens SET agent_name=$3'),
      ['owner', 'token', 'New name'],
    ]);
  });
});
