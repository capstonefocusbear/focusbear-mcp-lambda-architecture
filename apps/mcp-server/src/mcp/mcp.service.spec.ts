import { isJsonRpcNotification, McpService, SUPPORTED_PROTOCOL_VERSIONS } from './mcp.service';

describe('McpService initialization flow', () => {
  let service: McpService;
  let tasksService: { listTasks: jest.Mock; updateTaskStatus: jest.Mock };
  let written: string[];
  const stream = { write: (chunk: string) => written.push(chunk) };
  const TOKEN = 'Bearer test-token';

  const lastMessage = () => JSON.parse(written[written.length - 1].replace(/^data: /, '').trim());

  beforeEach(() => {
    tasksService = { listTasks: jest.fn().mockResolvedValue([]), updateTaskStatus: jest.fn() };
    service = new McpService(tasksService as any);
    written = [];
  });

  it('initialize returns protocol version, capabilities and server info', async () => {
    await service.handleStreamRequest(
      {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: { protocolVersion: '2025-03-26', clientInfo: { name: 'test' } },
      },
      TOKEN,
      stream,
    );
    const msg = lastMessage();
    expect(msg.jsonrpc).toBe('2.0');
    expect(msg.id).toBe(1);
    expect(msg.result.protocolVersion).toBe('2025-03-26');
    expect(msg.result.capabilities.tools).toBeDefined();
    expect(msg.result.serverInfo.name).toBe('focusbear-mcp-server');
  });

  it('initialize falls back to the newest supported version for an unknown version', async () => {
    await service.handleStreamRequest(
      { jsonrpc: '2.0', id: 2, method: 'initialize', params: { protocolVersion: '1999-01-01' } },
      TOKEN,
      stream,
    );
    expect(lastMessage().result.protocolVersion).toBe(SUPPORTED_PROTOCOL_VERSIONS[0]);
  });

  it('notifications/initialized writes nothing to the stream', async () => {
    await service.handleStreamRequest({ jsonrpc: '2.0', method: 'notifications/initialized' }, TOKEN, stream);
    expect(written).toHaveLength(0);
  });

  it('notifications are accepted even without a token', async () => {
    await service.handleStreamRequest({ jsonrpc: '2.0', method: 'notifications/initialized' }, '', stream);
    expect(written).toHaveLength(0);
  });

  it('ping returns an empty result', async () => {
    await service.handleStreamRequest({ jsonrpc: '2.0', id: 3, method: 'ping' }, TOKEN, stream);
    expect(lastMessage().result).toEqual({});
  });

  it('tools/list still works after the handshake', async () => {
    await service.handleStreamRequest({ jsonrpc: '2.0', id: 4, method: 'tools/list' }, TOKEN, stream);
    const names = lastMessage().result.tools.map((t: any) => t.name);
    expect(names).toEqual(['list_tasks', 'update_task_status']);
  });

  it('tools/call list_tasks passes the bearer token through', async () => {
    await service.handleStreamRequest(
      { jsonrpc: '2.0', id: 5, method: 'tools/call', params: { name: 'list_tasks' } },
      TOKEN,
      stream,
    );
    expect(tasksService.listTasks).toHaveBeenCalledWith('test-token', {});
  });

  it('rejects requests with no token', async () => {
    await service.handleStreamRequest({ jsonrpc: '2.0', id: 6, method: 'initialize' }, '', stream);
    expect(lastMessage().error.code).toBe(401);
  });

  it('returns method not found for unknown methods', async () => {
    await service.handleStreamRequest({ jsonrpc: '2.0', id: 7, method: 'nope/nope' }, TOKEN, stream);
    expect(lastMessage().error.code).toBe(-32601);
  });

  it('isJsonRpcNotification detects notifications', () => {
    expect(isJsonRpcNotification({ method: 'notifications/initialized' })).toBe(true);
    expect(isJsonRpcNotification({ id: 1, method: 'ping' })).toBe(false);
    expect(isJsonRpcNotification({})).toBe(false);
  });
});
