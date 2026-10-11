import { createServer } from 'node:http';
import request = require('supertest');
import { createAdapterHandler } from './http';
import { AdapterConfig } from './config';
import { BackendClient, BackendError } from './backend';
import { silentLogger } from './logger';

const config: AdapterConfig = {
  resourceUrl: 'http://localhost:5039/mcp',
  issuer: 'http://localhost:5040',
  jwksUrl: 'http://localhost:5040/oauth/jwks',
  backendUrl: 'http://localhost:5041',
  allowedOrigins: [],
  allowLocalHttp: true,
};

function app(scopes = ['mcp.tasks.read', 'mcp.tasks.write'], backend?: BackendClient) {
  const verifier = {
    verify: jest.fn(async (token: string) => {
      if (token !== 'valid') throw new Error('invalid_token');
      return { subject: 'user-1', scopes: new Set(scopes) };
    }),
  };
  const call = jest.fn(async (_method: string, path: string) => {
    const item = { id: '123e4567-e89b-12d3-a456-426614174000', title: 'Task', assigned_mcp_token_id: 'secret' };
    if (path === '/mcp/tasks') return { data: [item], meta: { itemCount: 1 } };
    if (path.endsWith('/notes')) return { id: item.id, task_id: item.id, content: 'Progress' };
    if (path.endsWith('/project-statuses')) return { id: item.id, label: 'Review', color: '#112233' };
    return item;
  });
  const server = createServer(
    createAdapterHandler({
      config,
      verifier,
      backend: backend || ({ request: call } as unknown as BackendClient),
      logger: silentLogger,
    }),
  );
  const post = (body: object, token = 'valid') =>
    request(server)
      .post('/mcp')
      .set('Host', 'localhost:5039')
      .set('Authorization', `Bearer ${token}`)
      .set('Accept', 'application/json, text/event-stream')
      .send(body);
  return { server, post, call, verifier };
}

describe('MCP OAuth adapter', () => {
  it('publishes metadata and challenges missing credentials', async () => {
    const { server } = app();
    const metadata = await request(server).get('/.well-known/oauth-protected-resource').set('Host', 'localhost:5039');
    expect(metadata.status).toBe(200);
    expect(metadata.body.resource).toBe(config.resourceUrl);
    expect(metadata.body.authorization_servers).toEqual([config.issuer]);
    const response = await request(server).get('/mcp').set('Host', 'localhost:5039');
    expect(response.status).toBe(401);
    expect(response.headers['www-authenticate']).toContain('resource_metadata=');
  });

  it('initializes and lists the five tools through the SDK transport', async () => {
    const { post } = app();
    const init = await post({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'test', version: '1' } },
    });
    expect(init.status).toBe(200);
    expect(init.body.result.serverInfo.name).toBe('focusware-mcp');
    const listed = await post({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} });
    expect(listed.status).toBe(200);
    expect(listed.body.result.tools.map((tool: any) => tool.name)).toHaveLength(5);
  });

  it('rejects insufficient scope and extra arguments before backend access', async () => {
    const { post, call } = app(['mcp.tasks.read']);
    const denied = await post({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'focusware_add_assigned_task_note',
        arguments: { task_id: '123e4567-e89b-12d3-a456-426614174000', content: 'Hello' },
      },
    });
    expect(denied.status).toBe(403);
    expect(denied.headers['www-authenticate']).toContain('insufficient_scope');
    const extra = await post({
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: { name: 'focusware_list_assigned_tasks', arguments: { path: '/admin' } },
    });
    expect(extra.status).toBe(400);
    expect(call).not.toHaveBeenCalled();
  });

  it('calls the fixed read route and removes internal fields', async () => {
    const { post, call } = app();
    const response = await post({
      jsonrpc: '2.0',
      id: 5,
      method: 'tools/call',
      params: { name: 'focusware_list_assigned_tasks', arguments: { page: 1 } },
    });
    expect(response.status).toBe(200);
    expect(call).toHaveBeenCalledWith('GET', '/mcp/tasks', 'valid', 'user-1', expect.any(String), undefined, {
      page: 1,
    });
    expect(response.text).not.toContain('assigned_mcp_token_id');
  });

  it.each([
    [
      'focusware_get_assigned_task',
      { task_id: '123e4567-e89b-12d3-a456-426614174000' },
      'GET',
      '/mcp/tasks/123e4567-e89b-12d3-a456-426614174000',
    ],
    [
      'focusware_update_assigned_task_status',
      { task_id: '123e4567-e89b-12d3-a456-426614174000', status: 'IN_PROGRESS' },
      'PATCH',
      '/mcp/tasks/123e4567-e89b-12d3-a456-426614174000/status',
    ],
    [
      'focusware_add_assigned_task_note',
      { task_id: '123e4567-e89b-12d3-a456-426614174000', content: 'Progress' },
      'POST',
      '/mcp/tasks/123e4567-e89b-12d3-a456-426614174000/notes',
    ],
    [
      'focusware_ensure_project_status',
      { project_id: '123e4567-e89b-12d3-a456-426614174000', label: 'Review', color: '#112233' },
      'POST',
      '/mcp/tasks/project-statuses',
    ],
  ])('maps %s to its fixed backend route', async (name, args, method, path) => {
    const { post, call } = app();
    const response = await post({ jsonrpc: '2.0', id: 7, method: 'tools/call', params: { name, arguments: args } });
    expect(response.status).toBe(200);
    expect(response.body.result.isError).toBeUndefined();
    expect(call.mock.calls[0].slice(0, 5)).toEqual([method, path, 'valid', 'user-1', expect.any(String)]);
  });

  it('redacts backend errors and keeps users isolated', async () => {
    const backend = {
      request: jest.fn(async () => {
        throw new BackendError('backend_unavailable', 503);
      }),
    } as unknown as BackendClient;
    const { post } = app(undefined, backend);
    const response = await post({
      jsonrpc: '2.0',
      id: 6,
      method: 'tools/call',
      params: { name: 'focusware_get_assigned_task', arguments: { task_id: '123e4567-e89b-12d3-a456-426614174000' } },
    });
    expect(response.status).toBe(200);
    expect(response.body.result.isError).toBe(true);
    expect(response.text).toContain('request_id');
    expect(response.text).not.toContain('secret');
  });

  it('keeps concurrent request identities separate', async () => {
    const call = jest.fn(async (_method: string, _path: string, _token: string, _subject: string) => ({
      data: [],
      meta: {},
    }));
    const verifier = {
      verify: jest.fn(async (token: string) => ({
        subject: token === 'alice-token' ? 'alice' : 'bob',
        scopes: new Set(['mcp.tasks.read']),
      })),
    };
    const server = createServer(
      createAdapterHandler({
        config,
        verifier,
        backend: { request: call } as unknown as BackendClient,
        logger: silentLogger,
      }),
    );
    const send = (token: string) =>
      request(server)
        .post('/mcp')
        .set('Host', 'localhost:5039')
        .set('Authorization', `Bearer ${token}`)
        .set('Accept', 'application/json, text/event-stream')
        .send({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: { name: 'focusware_list_assigned_tasks', arguments: {} },
        });
    const responses = await Promise.all([send('alice-token'), send('bob-token')]);
    expect(responses.map((response) => response.status)).toEqual([200, 200]);
    expect(call.mock.calls.map((args: unknown[]) => args.slice(2, 4))).toEqual(
      expect.arrayContaining([
        ['alice-token', 'alice'],
        ['bob-token', 'bob'],
      ]),
    );
  });
});
