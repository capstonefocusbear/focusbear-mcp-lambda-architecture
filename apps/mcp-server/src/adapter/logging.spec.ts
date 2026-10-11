import { createServer } from 'node:http';
import request = require('supertest');
import { createAdapterHandler } from './http';
import { AdapterConfig } from './config';
import { BackendClient, BackendError } from './backend';
import { createLogger, hashSubject } from './logger';

const config: AdapterConfig = {
  resourceUrl: 'http://localhost:5039/mcp',
  issuer: 'http://localhost:5040',
  jwksUrl: 'http://localhost:5040/oauth/jwks',
  backendUrl: 'http://localhost:5041',
  allowedOrigins: [],
  allowLocalHttp: true,
};

// Values that must never appear in a log line, whatever the request outcome.
const clientToken = 'eyJhbGciOiJSUzI1NiIsImtpZCI6ImsxIn0.eyJzdWIiOiJhdXRoMHx1c2VyLTEifQ.Y2xpZW50LXNpZ25hdHVyZQ';
const otherToken = 'eyJhbGciOiJSUzI1NiIsImtpZCI6ImsxIn0.eyJzdWIiOiJhdXRoMHxtYWxsb3J5In0.Zm9yZ2VkLXNpZ25hdHVyZQ';
const subject = 'auth0|user-1';
const taskId = '123e4567-e89b-12d3-a456-426614174000';
const taskTitle = 'Prepare confidential board pack';
const taskDetails = 'Salary review notes for the leadership team';
const noteContent = 'Private progress note written by the agent';
const internalId = 'assigned-token-record-77';
const forbidden = [clientToken, otherToken, subject, taskTitle, taskDetails, noteContent, internalId, 'Bearer '];

function app(options: { scopes?: string[]; backend?: BackendClient } = {}) {
  const lines: string[] = [];
  const logger = createLogger({ level: 'debug', sink: (line) => lines.push(line) });
  const verifier = {
    verify: jest.fn(async (token: string) => {
      if (token !== clientToken)
        throw Object.assign(new Error(`jwt malformed: ${token}`), { name: 'JsonWebTokenError' });
      return { subject, scopes: new Set(options.scopes || ['mcp.tasks.read', 'mcp.tasks.write']) };
    }),
  };
  const call = jest.fn(async (_method: string, path: string) => {
    const item = { id: taskId, title: taskTitle, details: taskDetails, assigned_mcp_token_id: internalId };
    if (path === '/mcp/tasks') return { data: [item], meta: { itemCount: 1 } };
    if (path.endsWith('/notes')) return { id: taskId, task_id: taskId, content: noteContent };
    return item;
  });
  const server = createServer(
    createAdapterHandler({
      config,
      verifier,
      backend: options.backend || ({ request: call } as unknown as BackendClient),
      logger,
    }),
  );
  const post = (body: object, token = clientToken) =>
    request(server)
      .post('/mcp')
      .set('Host', 'localhost:5039')
      .set('Authorization', `Bearer ${token}`)
      .set('Accept', 'application/json, text/event-stream')
      .send(body);
  const entries = () => lines.map((line) => JSON.parse(line));
  const completed = () => entries().filter((entry) => entry.event === 'request_completed');
  const expectNoSecrets = () => {
    const text = lines.join('\n');
    for (const value of forbidden) expect(text).not.toContain(value);
  };
  return { server, post, lines, entries, completed, expectNoSecrets };
}

const toolCall = (name: string, args: object, id = 1) => ({
  jsonrpc: '2.0',
  id,
  method: 'tools/call',
  params: { name, arguments: args },
});

describe('MCP adapter logging', () => {
  it('logs a successful tool call as structured JSON without tokens or task content', async () => {
    const { post, lines, entries, completed, expectNoSecrets } = app();
    const response = await post(
      toolCall('focusware_add_assigned_task_note', { task_id: taskId, content: noteContent }),
    );
    expect(response.status).toBe(200);
    expect(response.text).toContain(noteContent);

    expect(lines).toHaveLength(2);
    const [tool, done] = entries();
    expect(tool).toMatchObject({
      level: 'info',
      service: 'focusware-mcp',
      event: 'tool_call_completed',
      tool: 'focusware_add_assigned_task_note',
      outcome: 'ok',
      duration_ms: expect.any(Number),
    });
    expect(done).toMatchObject({
      level: 'info',
      event: 'request_completed',
      http_method: 'POST',
      route: '/mcp',
      status: 200,
      outcome: 'handled',
      rpc_method: 'tools/call',
      tool: 'focusware_add_assigned_task_note',
      subject_hash: hashSubject(subject),
      duration_ms: expect.any(Number),
    });
    // The same ID links both lines to the response header returned to the client.
    expect(done.request_id).toBe(response.headers['x-request-id']);
    expect(tool.request_id).toBe(done.request_id);
    expect(Number.isNaN(Date.parse(done.timestamp))).toBe(false);
    expect(completed()).toHaveLength(1);
    expectNoSecrets();
  });

  it('logs task reads without the returned task data', async () => {
    const { post, completed, expectNoSecrets } = app();
    const response = await post(toolCall('focusware_list_assigned_tasks', { page: 1 }));
    expect(response.text).toContain(taskTitle);
    expect(completed()[0]).toMatchObject({ status: 200, tool: 'focusware_list_assigned_tasks' });
    expectNoSecrets();
  });

  it('logs rejected credentials with a reason and never the token', async () => {
    const { server, post, completed, expectNoSecrets } = app();
    await request(server).get('/mcp').set('Host', 'localhost:5039');
    await post({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }, otherToken);
    const [missing, invalid] = completed();
    expect(missing).toMatchObject({ level: 'warn', status: 401, outcome: 'missing_credentials', http_method: 'GET' });
    expect(invalid).toMatchObject({
      level: 'warn',
      status: 401,
      outcome: 'invalid_token',
      error_name: 'JsonWebTokenError',
    });
    expect(invalid.subject_hash).toBeUndefined();
    expectNoSecrets();
  });

  it('logs scope and argument rejections without the arguments', async () => {
    const { post, completed, expectNoSecrets } = app({ scopes: ['mcp.tasks.read'] });
    await post(toolCall('focusware_add_assigned_task_note', { task_id: taskId, content: noteContent }));
    await post(toolCall('focusware_list_assigned_tasks', { path: taskDetails }));
    const [scope, args] = completed();
    expect(scope).toMatchObject({ level: 'warn', status: 403, outcome: 'insufficient_scope' });
    expect(args).toMatchObject({ level: 'warn', status: 400, outcome: 'invalid_tool_arguments' });
    expectNoSecrets();
  });

  it('logs a backend failure with its fixed error code', async () => {
    const backend = {
      request: jest.fn(async () => {
        throw new BackendError('backend_unauthorized', 401);
      }),
    } as unknown as BackendClient;
    const { post, entries, expectNoSecrets } = app({ backend });
    const response = await post(toolCall('focusware_get_assigned_task', { task_id: taskId }));
    expect(response.body.result.isError).toBe(true);
    const failed = entries().find((entry) => entry.event === 'tool_call_failed');
    expect(failed).toMatchObject({
      level: 'warn',
      tool: 'focusware_get_assigned_task',
      outcome: 'error',
      error_code: 'backend_unauthorized',
      request_id: response.headers['x-request-id'],
    });
    expectNoSecrets();
  });

  it('does not log the message of an unexpected error', async () => {
    const backend = {
      request: jest.fn(async () => {
        throw new TypeError(`fetch failed for Bearer ${clientToken} while loading ${taskTitle}`);
      }),
    } as unknown as BackendClient;
    const { post, entries, expectNoSecrets } = app({ backend });
    await post(toolCall('focusware_get_assigned_task', { task_id: taskId }));
    const failed = entries().find((entry) => entry.event === 'tool_call_failed');
    expect(failed).toMatchObject({ error_code: 'backend_unavailable', error_name: 'TypeError' });
    expectNoSecrets();
  });

  it('does not log client-chosen paths, methods, or tool names verbatim', async () => {
    const { server, post, completed, expectNoSecrets } = app();
    await request(server).get(`/mcp/${clientToken}?access_token=${clientToken}`).set('Host', 'localhost:5039');
    await post({ jsonrpc: '2.0', id: 1, method: `Bearer ${clientToken}`, params: {} });
    await post(toolCall(clientToken, { content: noteContent }));
    await post(toolCall('constructor', {}));
    const [path, method, tool, proto] = completed();
    expect(path).toMatchObject({ status: 404, route: 'other', outcome: 'not_found' });
    expect(method.rpc_method).toBe('invalid');
    expect(tool.tool).toBe('unknown');
    expect(proto.tool).toBe('unknown');
    expectNoSecrets();
  });

  it('logs public and blocked requests', async () => {
    const { server, completed, expectNoSecrets } = app();
    await request(server).get('/.well-known/oauth-protected-resource').set('Host', 'localhost:5039');
    await request(server).get('/mcp').set('Host', 'localhost:5039').set('Origin', 'https://evil.example');
    await request(server).get('/mcp').set('Host', 'evil.example');
    expect(completed()).toMatchObject([
      { level: 'info', status: 200, route: '/.well-known/oauth-protected-resource', outcome: 'metadata' },
      { level: 'warn', status: 403, outcome: 'origin_not_allowed' },
      { level: 'warn', status: 403, outcome: 'host_mismatch' },
    ]);
    expectNoSecrets();
  });

  it('logs an oversized or malformed body without its content', async () => {
    const { server, completed, expectNoSecrets } = app();
    const send = (body: string) =>
      request(server)
        .post('/mcp')
        .set('Host', 'localhost:5039')
        .set('Authorization', `Bearer ${clientToken}`)
        .set('Accept', 'application/json, text/event-stream')
        .set('Content-Type', 'application/json')
        .send(body);
    await send(`{"note":"${noteContent}"`);
    await send(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', pad: noteContent.repeat(30000) }));
    expect(completed()).toMatchObject([
      { status: 400, outcome: 'invalid_body' },
      { status: 413, outcome: 'body_too_large' },
    ]);
    expectNoSecrets();
  });

  it('keeps concurrent requests on separate request IDs and users', async () => {
    const lines: string[] = [];
    const verifier = {
      verify: jest.fn(async (token: string) => ({
        subject: token === 'alice-token' ? 'alice' : 'bob',
        scopes: new Set(['mcp.tasks.read']),
      })),
    };
    const backend = { request: jest.fn(async () => ({ data: [], meta: {} })) } as unknown as BackendClient;
    const server = createServer(
      createAdapterHandler({
        config,
        verifier,
        backend,
        logger: createLogger({ sink: (line) => lines.push(line) }),
      }),
    );
    const send = (token: string) =>
      request(server)
        .post('/mcp')
        .set('Host', 'localhost:5039')
        .set('Authorization', `Bearer ${token}`)
        .set('Accept', 'application/json, text/event-stream')
        .send(toolCall('focusware_list_assigned_tasks', {}));
    const responses = await Promise.all([send('alice-token'), send('bob-token')]);
    const done = lines.map((line) => JSON.parse(line)).filter((entry) => entry.event === 'request_completed');
    expect(done.map((entry) => entry.subject_hash).sort()).toEqual([hashSubject('alice'), hashSubject('bob')].sort());
    expect(new Set(done.map((entry) => entry.request_id))).toEqual(
      new Set(responses.map((response) => response.headers['x-request-id'])),
    );
    expect(lines.join('\n')).not.toMatch(/alice|bob/);
  });
});
