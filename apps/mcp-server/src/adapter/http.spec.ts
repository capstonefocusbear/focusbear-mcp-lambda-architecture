import { createServer, IncomingMessage, request as httpRequest, ServerResponse } from 'node:http';
import { AddressInfo, Socket } from 'node:net';
import request = require('supertest');
import { createAdapterHandler } from './http';
import { AdapterConfig } from './config';
import { BackendClient, BackendError } from './backend';

const config: AdapterConfig = {
  resourceUrl: 'http://localhost:5039/mcp',
  issuer: 'http://localhost:5040',
  jwksUrl: 'http://localhost:5040/oauth/jwks',
  backendUrl: 'http://localhost:5041',
  allowedOrigins: [],
  allowedClients: ['public-client'],
  tokenProfile: 'auth0',
  allowLocalHttp: true,
};

function app(scopes = ['mcp.tasks.read', 'mcp.tasks.write'], backend?: BackendClient) {
  const verifier = {
    verify: jest.fn(async (token: string) => {
      if (token !== 'valid') throw new Error('invalid_token');
      return {
        subject: 'user-1',
        issuer: config.issuer,
        clientId: 'public-client',
        expiresAt: 9999999999,
        scopes: new Set(scopes),
      };
    }),
  };
  const call = jest.fn(async (_method: string, path: string) => {
    const item = { id: '123e4567-e89b-12d3-a456-426614174000', title: 'Task', assigned_mcp_token_id: 'secret' };
    if (path === '/mcp/tasks/summary') return { total: 5, not_started: 2, in_progress: 1, completed: 2, overdue: 1 };
    if (path === '/mcp/tasks') return { data: [item], meta: { itemCount: 1 } };
    if (path.endsWith('/notes')) return { id: item.id, task_id: item.id, content: 'Progress' };
    if (path.endsWith('/project-statuses')) return { id: item.id, label: 'Review', color: '#112233' };
    return item;
  });
  const server = createServer(
    createAdapterHandler({ config, verifier, backend: backend || ({ request: call } as unknown as BackendClient) }),
  );
  const post = (input: any, token = 'valid') => {
    const body = modern(input);
    return request(server)
      .post('/mcp')
      .set('Host', 'localhost:5039')
      .set('Authorization', `Bearer ${token}`)
      .set('Accept', 'application/json, text/event-stream')
      .set('MCP-Protocol-Version', '2026-07-28')
      .set('Mcp-Method', body.method)
      .set('Mcp-Name', body.params.name || '')
      .send(body);
  };
  return { server, post, call, verifier };
}

function modern(body: any, version = '2026-07-28') {
  return {
    ...body,
    params: {
      _meta: { 'io.modelcontextprotocol/protocolVersion': version, 'io.modelcontextprotocol/clientCapabilities': {} },
      ...body.params,
    },
  };
}

describe('MCP OAuth adapter', () => {
  it('returns safe 400 for a malformed absolute-form request target', async () => {
    const req = new IncomingMessage(new Socket());
    req.headers.host = 'localhost:5039';
    req.url = 'http://[';
    req.method = 'GET';
    const res = new ServerResponse(req);
    const end = jest.spyOn(res, 'end').mockImplementation(() => res);
    const verifier = { verify: jest.fn() };
    const handler = createAdapterHandler({ config, verifier, backend: {} as BackendClient });
    await expect(handler(req, res)).resolves.toBeUndefined();
    expect(res.statusCode).toBe(400);
    expect(String(end.mock.calls[0][0])).toContain('Invalid request target');
    expect(String(end.mock.calls[0][0])).not.toContain('http://[');
    expect(verifier.verify).not.toHaveBeenCalled();
  });

  it('contains unexpected request handler errors at its outer boundary', async () => {
    const req = new IncomingMessage(new Socket());
    req.headers.host = 'localhost:5039';
    req.url = '/mcp';
    req.method = 'GET';
    const res = new ServerResponse(req);
    jest.spyOn(res, 'setHeader').mockImplementationOnce(() => {
      throw new Error('private failure details');
    });
    const end = jest.spyOn(res, 'end').mockImplementation(() => res);
    const handler = createAdapterHandler({ config, verifier: { verify: jest.fn() }, backend: {} as BackendClient });
    await expect(handler(req, res)).resolves.toBeUndefined();
    expect(res.statusCode).toBe(500);
    expect(String(end.mock.calls[0][0])).toContain('Internal server error');
    expect(String(end.mock.calls[0][0])).not.toContain('private failure details');
  });

  it('exposes challenge and correlation headers only to allowed browser origins', async () => {
    const server = createServer(
      createAdapterHandler({
        config: { ...config, allowedOrigins: ['https://client.example'] },
        verifier: { verify: jest.fn() },
        backend: {} as BackendClient,
      }),
    );
    const allowed = await request(server)
      .get('/mcp')
      .set('Host', 'localhost:5039')
      .set('Origin', 'https://client.example');
    expect(allowed.status).toBe(401);
    expect(allowed.headers['access-control-expose-headers']).toBe('WWW-Authenticate, X-Request-Id');
    const denied = await request(server)
      .get('/mcp')
      .set('Host', 'localhost:5039')
      .set('Origin', 'https://attacker.example');
    expect(denied.status).toBe(403);
    expect(denied.headers['access-control-expose-headers']).toBeUndefined();
  });

  it('publishes metadata and challenges missing credentials', async () => {
    const { server } = app();
    const metadata = await request(server).get('/.well-known/oauth-protected-resource').set('Host', 'localhost:5039');
    expect(metadata.status).toBe(200);
    expect(metadata.body.resource).toBe(config.resourceUrl);
    expect(metadata.body.authorization_servers).toEqual([config.issuer]);
    const response = await request(server).get('/mcp').set('Host', 'localhost:5039');
    expect(response.status).toBe(401);
    expect(response.headers['www-authenticate']).toContain('resource_metadata=');
    expect(response.headers['www-authenticate']).toContain('mcp.summary.read');
  });

  it('discovers and lists six tools without initialization or sessions', async () => {
    const { post } = app();
    const discovered = await post({ jsonrpc: '2.0', id: 1, method: 'server/discover' });
    expect(discovered.status).toBe(200);
    expect(discovered.body.result._meta['io.modelcontextprotocol/serverInfo'].name).toBe('focusware-mcp');
    expect(discovered.body.result.supportedVersions).toEqual(['2026-07-28']);
    const listed = await post({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} });
    expect(listed.status).toBe(200);
    expect(listed.body.result.resultType).toBe('complete');
    expect(listed.body.result.tools.map((tool: any) => tool.name)).toHaveLength(6);
    expect(listed.headers['mcp-session-id']).toBeUndefined();
  });

  it.each(['/.well-known/oauth-protected-resource', '/.well-known/oauth-protected-resource/mcp'])(
    'publishes canonical metadata at %s',
    async (path) => {
      const { server } = app();
      const response = await request(server).get(path).set('Host', 'localhost:5039');
      expect(response.status).toBe(200);
      expect(response.body.scopes_supported).toContain('mcp.summary.read');
    },
  );

  it.each([
    [{}, -32020],
    [{ 'MCP-Protocol-Version': '2026-07-28', 'Mcp-Method': 'tools/call' }, -32020],
    [{ 'MCP-Protocol-Version': '1900-01-01', 'Mcp-Method': 'tools/list' }, -32022],
  ])('rejects missing, mismatched, and unsupported metadata %j', async (headers, code) => {
    const { server, call } = app();
    const version = headers['MCP-Protocol-Version'] || '2026-07-28';
    const response = await request(server)
      .post('/mcp')
      .set('Host', 'localhost:5039')
      .set('Authorization', 'Bearer valid')
      .set('Accept', 'application/json, text/event-stream')
      .set(headers)
      .send(modern({ jsonrpc: '2.0', id: 91, method: 'tools/list' }, version));
    expect(response.status).toBe(400);
    expect(response.body.id).toBe(91);
    expect(response.body.error.code).toBe(code);
    if (code === -32022) expect(response.body.error.data.supported).toEqual(['2026-07-28']);
    expect(call).not.toHaveBeenCalled();
  });

  it('requires body version and capabilities and rejects unknown methods', async () => {
    const { post } = app();
    const missing = await post({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: { _meta: {} } });
    expect(missing.status).toBe(400);
    expect(missing.body.error.code).toBe(-32602);
    const unknown = await post({ jsonrpc: '2.0', id: 2, method: 'initialize' });
    expect(unknown.status).toBe(404);
    expect(unknown.body.error.code).toBe(-32601);
  });

  it('forwards the summary tool with its separate scope', async () => {
    const { post, call } = app(['mcp.summary.read']);
    const response = await post({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: { name: 'focusware_get_assigned_tasks_summary', arguments: {} },
    });
    expect(response.status).toBe(200);
    expect(call.mock.calls[0].slice(0, 2)).toEqual(['GET', '/mcp/tasks/summary']);
    expect(JSON.parse(response.body.result.content[0].text)).toEqual({
      total: 5,
      not_started: 2,
      in_progress: 1,
      completed: 2,
      overdue: 1,
    });
  });

  it('bounds the time spent waiting for an unfinished request body', async () => {
    const { server, call } = app();
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = (server.address() as AddressInfo).port;
    try {
      const status = await new Promise<number>((resolve, reject) => {
        const req = httpRequest(
          {
            hostname: '127.0.0.1',
            port,
            path: '/mcp',
            method: 'POST',
            headers: {
              Host: 'localhost:5039',
              Authorization: 'Bearer valid',
              'Content-Type': 'application/json',
              Accept: 'application/json, text/event-stream',
              'Transfer-Encoding': 'chunked',
            },
          },
          (res) => {
            res.resume();
            resolve(res.statusCode);
            req.destroy();
          },
        );
        req.on('error', reject);
        req.write('{');
        req.setTimeout(2000, () => {
          req.destroy();
          reject(new Error('body deadline missing'));
        });
      });
      expect(status).toBe(408);
      expect(call).not.toHaveBeenCalled();
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('rejects media types explicitly disabled by Accept quality', async () => {
    const { post } = app();
    const response = await post({ jsonrpc: '2.0', id: 1, method: 'tools/list' }).set(
      'Accept',
      'application/json, text/event-stream;q=0',
    );
    expect(response.status).toBe(406);
  });

  it('accepts only explicitly configured internal hosts and ignores forwarded hosts', async () => {
    const verifier = { verify: jest.fn() };
    const server = createServer(
      createAdapterHandler({
        config: { ...config, trustedInternalHosts: ['127.0.0.1:8080'] },
        verifier,
        backend: {} as BackendClient,
      }),
    );
    const allowed = await request(server).get('/.well-known/oauth-protected-resource').set('Host', '127.0.0.1:8080');
    expect(allowed.status).toBe(200);
    expect(allowed.body.resource).toBe(config.resourceUrl);
    const rejected = await request(server)
      .get('/.well-known/oauth-protected-resource')
      .set('Host', 'attacker.example')
      .set('X-Forwarded-Host', 'localhost:5039');
    expect(rejected.status).toBe(403);
  });

  it('emits only allowlisted telemetry fields even if the sink throws', async () => {
    const telemetry = jest.fn((_event: unknown) => {
      throw new Error('telemetry offline');
    });
    const server = createServer(
      createAdapterHandler({
        config,
        telemetry,
        verifier: {
          verify: jest.fn(async () => {
            throw new Error('private token');
          }),
        },
        backend: {} as BackendClient,
      }),
    );
    const response = await request(server)
      .post('/mcp')
      .set('Host', 'localhost:5039')
      .set('Authorization', 'Bearer private-token')
      .send({ method: 'private-method', params: { content: 'private task' } });
    expect(response.status).toBe(401);
    expect(telemetry.mock.calls[0][0]).toEqual({
      request_id: expect.any(String),
      status: 401,
      duration_ms: expect.any(Number),
      method: 'http',
    });
  });

  it('rejects a summary missing required numeric counts', async () => {
    const backend = {
      request: jest.fn(async () => ({ total: 5, completed: 'private value' })),
    } as unknown as BackendClient;
    const { post } = app(['mcp.summary.read'], backend);
    const response = await post({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: { name: 'focusware_get_assigned_tasks_summary', arguments: {} },
    });
    expect(response.body.result.isError).toBe(true);
    expect(response.text).not.toContain('private value');
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
    expect(call).toHaveBeenCalledWith(
      'GET',
      '/mcp/tasks',
      'valid',
      expect.objectContaining({ subject: 'user-1', issuer: config.issuer }),
      expect.any(String),
      undefined,
      {
        page: 1,
      },
    );
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
    expect(call.mock.calls[0].slice(0, 5)).toEqual([
      method,
      path,
      'valid',
      expect.objectContaining({ subject: 'user-1', issuer: config.issuer }),
      expect.any(String),
    ]);
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
    const call = jest.fn(async (_method: string, _path: string, _token: string, _context: any) => ({
      data: [],
      meta: {},
    }));
    const verifier = {
      verify: jest.fn(async (token: string) => ({
        subject: token === 'alice-token' ? 'alice' : 'bob',
        issuer: config.issuer,
        clientId: 'public-client',
        expiresAt: 9999999999,
        scopes: new Set(['mcp.tasks.read']),
      })),
    };
    const server = createServer(
      createAdapterHandler({ config, verifier, backend: { request: call } as unknown as BackendClient }),
    );
    const send = (token: string) =>
      request(server)
        .post('/mcp')
        .set('Host', 'localhost:5039')
        .set('Authorization', `Bearer ${token}`)
        .set('Accept', 'application/json, text/event-stream')
        .set('MCP-Protocol-Version', '2026-07-28')
        .set('Mcp-Method', 'tools/call')
        .set('Mcp-Name', 'focusware_list_assigned_tasks')
        .send(
          modern({
            jsonrpc: '2.0',
            id: 1,
            method: 'tools/call',
            params: { name: 'focusware_list_assigned_tasks', arguments: {} },
          }),
        );
    const responses = await Promise.all([send('alice-token'), send('bob-token')]);
    expect(responses.map((response) => response.status)).toEqual([200, 200]);
    expect(call.mock.calls.map((args: unknown[]) => args.slice(2, 4))).toEqual(
      expect.arrayContaining([
        ['alice-token', expect.objectContaining({ subject: 'alice', issuer: config.issuer })],
        ['bob-token', expect.objectContaining({ subject: 'bob', issuer: config.issuer })],
      ]),
    );
  });
});
