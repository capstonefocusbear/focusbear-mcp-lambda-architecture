import { randomUUID } from 'node:crypto';
import { IncomingMessage, ServerResponse } from 'node:http';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { AdapterConfig, metadataUrl } from './config';
import { TokenVerifier } from './auth';
import { BackendClient } from './backend';
import { createToolServer, toolScopes, validateToolCall } from './tools';

export interface AdapterDependencies {
  config: AdapterConfig;
  verifier: TokenVerifier;
  backend: BackendClient;
}

function json(res: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}): void {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers });
  res.end(JSON.stringify(body));
}

function protocolError(
  res: ServerResponse,
  status: number,
  message: string,
  headers: Record<string, string> = {},
): void {
  json(res, status, { jsonrpc: '2.0', error: { code: -32600, message }, id: null }, headers);
}

async function readBody(req: IncomingMessage): Promise<unknown> {
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > 1_048_576) throw new Error('too_large');
    chunks.push(buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function challenge(config: AdapterConfig, scope?: string, error?: string): string {
  const fields = [`resource_metadata="${metadataUrl(config)}"`];
  if (scope) fields.push(`scope="${scope}"`);
  if (error) fields.push(`error="${error}"`);
  return `Bearer ${fields.join(', ')}`;
}

export function createAdapterHandler({ config, verifier, backend }: AdapterDependencies) {
  const resourceOrigin = new URL(config.resourceUrl).origin;
  const expectedHost = new URL(config.resourceUrl).host;
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const requestId = randomUUID();
    res.setHeader('x-request-id', requestId);
    const origin = req.headers.origin;
    if (origin && origin !== resourceOrigin && !config.allowedOrigins.includes(origin)) {
      protocolError(res, 403, 'Forbidden');
      return;
    }
    if (req.headers.host && req.headers.host !== expectedHost) {
      protocolError(res, 403, 'Forbidden');
      return;
    }
    if (origin && config.allowedOrigins.includes(origin)) {
      res.setHeader('access-control-allow-origin', origin);
      res.setHeader('vary', 'Origin');
    }
    const path = new URL(req.url || '/', config.resourceUrl).pathname;
    if (path === '/.well-known/oauth-protected-resource' && req.method === 'GET') {
      json(res, 200, {
        resource: config.resourceUrl,
        authorization_servers: [config.issuer],
        scopes_supported: ['mcp.tasks.read', 'mcp.tasks.write'],
        bearer_methods_supported: ['header'],
      });
      return;
    }
    if (path !== '/mcp') {
      protocolError(res, 404, 'Not found');
      return;
    }
    if (req.method === 'OPTIONS' && origin && config.allowedOrigins.includes(origin)) {
      res.writeHead(204, {
        'access-control-allow-methods': 'POST, GET, OPTIONS',
        'access-control-allow-headers': 'authorization, content-type, accept, mcp-protocol-version',
      });
      res.end();
      return;
    }
    if (!['POST', 'GET'].includes(req.method || '')) {
      protocolError(res, 405, 'Method not allowed', { allow: 'POST, GET' });
      return;
    }
    const header = req.headers.authorization;
    const match = typeof header === 'string' && /^Bearer ([^\s]+)$/.exec(header);
    if (!match) {
      protocolError(res, 401, 'Unauthorized', {
        'www-authenticate': challenge(config, 'mcp.tasks.read mcp.tasks.write'),
      });
      return;
    }
    let verified;
    try {
      verified = await verifier.verify(match[1]);
    } catch {
      protocolError(res, 401, 'Unauthorized', { 'www-authenticate': challenge(config, undefined, 'invalid_token') });
      return;
    }
    if (req.method === 'GET') {
      protocolError(res, 405, 'Method not allowed', { allow: 'POST' });
      return;
    }
    if (!req.headers['content-type']?.toLowerCase().startsWith('application/json')) {
      protocolError(res, 415, 'Unsupported media type');
      return;
    }
    const accept = req.headers.accept || '';
    if (!accept.includes('application/json') || !accept.includes('text/event-stream')) {
      protocolError(res, 406, 'Not acceptable');
      return;
    }
    const version = req.headers['mcp-protocol-version'];
    if (version && !['2025-03-26', '2025-06-18', '2025-11-25'].includes(String(version))) {
      protocolError(res, 400, 'Unsupported protocol version');
      return;
    }
    let body: any;
    try {
      body = await readBody(req);
    } catch (error) {
      protocolError(res, error instanceof Error && error.message === 'too_large' ? 413 : 400, 'Invalid request body');
      return;
    }
    if (
      !body ||
      typeof body !== 'object' ||
      Array.isArray(body) ||
      body.jsonrpc !== '2.0' ||
      typeof body.method !== 'string' ||
      (!['string', 'number'].includes(typeof body.id) && body.id !== undefined)
    ) {
      protocolError(res, 400, 'Invalid JSON-RPC request');
      return;
    }
    if (body.method === 'tools/call') {
      const name = body.params?.name;
      const scope = toolScopes[name];
      if (scope && !verified.scopes.has(scope)) {
        protocolError(res, 403, 'Insufficient scope', {
          'www-authenticate': challenge(config, scope, 'insufficient_scope'),
        });
        return;
      }
      if (scope && !validateToolCall(name, body.params?.arguments)) {
        protocolError(res, 400, 'Invalid tool arguments');
        return;
      }
    }
    const server = createToolServer({ clientToken: match[1], verifiedToken: verified, requestId, backend });
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, body);
    } catch {
      if (!res.headersSent) protocolError(res, 500, 'Internal server error');
    } finally {
      await transport.close();
      await server.close();
    }
  };
}
