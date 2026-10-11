import { randomUUID } from 'node:crypto';
import { IncomingMessage, ServerResponse } from 'node:http';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { AdapterConfig, metadataUrl } from './config';
import { TokenVerifier } from './auth';
import { BackendClient } from './backend';
import { createToolServer, toolScopes, validateToolCall } from './tools';
import { describeError, hashSubject, LogFields, Logger } from './logger';

export interface AdapterDependencies {
  config: AdapterConfig;
  verifier: TokenVerifier;
  backend: BackendClient;
  logger: Logger;
}

const METADATA_PATH = '/.well-known/oauth-protected-resource';
const rpcMethodName = /^[a-zA-Z][a-zA-Z0-9_/]{0,63}$/;

// Client-controlled strings are logged only when they match a known value or a strict pattern,
// so a token pasted into a path, method, or tool name cannot reach the logs.
function loggedRoute(path: string): string {
  return path === '/mcp' || path === METADATA_PATH ? path : 'other';
}

function loggedName(value: unknown, known?: Record<string, unknown>): string {
  if (typeof value !== 'string') return 'invalid';
  if (known) return Object.prototype.hasOwnProperty.call(known, value) ? value : 'unknown';
  return rpcMethodName.test(value) ? value : 'invalid';
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

export function createAdapterHandler({ config, verifier, backend, logger }: AdapterDependencies) {
  const resourceOrigin = new URL(config.resourceUrl).origin;
  const expectedHost = new URL(config.resourceUrl).host;
  const handle = async (
    req: IncomingMessage,
    res: ServerResponse,
    requestId: string,
    log: LogFields,
  ): Promise<void> => {
    // Sends a protocol error and records why, using a fixed reason code rather than request data.
    const reject = (status: number, outcome: string, message: string, headers?: Record<string, string>): void => {
      log.outcome = outcome;
      protocolError(res, status, message, headers);
    };
    const origin = req.headers.origin;
    if (origin && origin !== resourceOrigin && !config.allowedOrigins.includes(origin)) {
      reject(403, 'origin_not_allowed', 'Forbidden');
      return;
    }
    if (req.headers.host && req.headers.host !== expectedHost) {
      reject(403, 'host_mismatch', 'Forbidden');
      return;
    }
    if (origin && config.allowedOrigins.includes(origin)) {
      res.setHeader('access-control-allow-origin', origin);
      res.setHeader('vary', 'Origin');
    }
    const path = new URL(req.url || '/', config.resourceUrl).pathname;
    log.route = loggedRoute(path);
    if (path === METADATA_PATH && req.method === 'GET') {
      log.outcome = 'metadata';
      json(res, 200, {
        resource: config.resourceUrl,
        authorization_servers: [config.issuer],
        scopes_supported: ['mcp.tasks.read', 'mcp.tasks.write'],
        bearer_methods_supported: ['header'],
      });
      return;
    }
    if (path !== '/mcp') {
      reject(404, 'not_found', 'Not found');
      return;
    }
    if (req.method === 'OPTIONS' && origin && config.allowedOrigins.includes(origin)) {
      log.outcome = 'cors_preflight';
      res.writeHead(204, {
        'access-control-allow-methods': 'POST, GET, OPTIONS',
        'access-control-allow-headers': 'authorization, content-type, accept, mcp-protocol-version',
      });
      res.end();
      return;
    }
    if (!['POST', 'GET'].includes(req.method || '')) {
      reject(405, 'method_not_allowed', 'Method not allowed', { allow: 'POST, GET' });
      return;
    }
    const header = req.headers.authorization;
    const match = typeof header === 'string' && /^Bearer ([^\s]+)$/.exec(header);
    if (!match) {
      reject(401, 'missing_credentials', 'Unauthorized', {
        'www-authenticate': challenge(config, 'mcp.tasks.read mcp.tasks.write'),
      });
      return;
    }
    let verified;
    try {
      verified = await verifier.verify(match[1]);
    } catch (error) {
      // Only the error class is logged: it separates expired tokens from bad signatures and JWKS outages.
      log.error_name = describeError(error).error_name;
      reject(401, 'invalid_token', 'Unauthorized', {
        'www-authenticate': challenge(config, undefined, 'invalid_token'),
      });
      return;
    }
    log.subject_hash = hashSubject(verified.subject);
    if (req.method === 'GET') {
      reject(405, 'method_not_allowed', 'Method not allowed', { allow: 'POST' });
      return;
    }
    if (!req.headers['content-type']?.toLowerCase().startsWith('application/json')) {
      reject(415, 'unsupported_media_type', 'Unsupported media type');
      return;
    }
    const accept = req.headers.accept || '';
    if (!accept.includes('application/json') || !accept.includes('text/event-stream')) {
      reject(406, 'not_acceptable', 'Not acceptable');
      return;
    }
    const version = req.headers['mcp-protocol-version'];
    if (version && !['2025-03-26', '2025-06-18', '2025-11-25'].includes(String(version))) {
      reject(400, 'unsupported_protocol_version', 'Unsupported protocol version');
      return;
    }
    let body: any;
    try {
      body = await readBody(req);
    } catch (error) {
      const tooLarge = error instanceof Error && error.message === 'too_large';
      reject(tooLarge ? 413 : 400, tooLarge ? 'body_too_large' : 'invalid_body', 'Invalid request body');
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
      reject(400, 'invalid_jsonrpc', 'Invalid JSON-RPC request');
      return;
    }
    log.rpc_method = loggedName(body.method);
    if (body.method === 'tools/call') {
      const name = body.params?.name;
      log.tool = loggedName(name, toolScopes);
      const scope = toolScopes[name];
      if (scope && !verified.scopes.has(scope)) {
        reject(403, 'insufficient_scope', 'Insufficient scope', {
          'www-authenticate': challenge(config, scope, 'insufficient_scope'),
        });
        return;
      }
      if (scope && !validateToolCall(name, body.params?.arguments)) {
        reject(400, 'invalid_tool_arguments', 'Invalid tool arguments');
        return;
      }
    }
    const server = createToolServer({ clientToken: match[1], subject: verified.subject, requestId, backend, logger });
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, body);
      log.outcome = 'handled';
    } catch (error) {
      log.outcome = 'internal_error';
      log.error_name = describeError(error).error_name;
      if (!res.headersSent) protocolError(res, 500, 'Internal server error');
    } finally {
      await transport.close();
      await server.close();
    }
  };
  // One structured line per request. It never includes headers, bodies, tokens, or task content.
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const requestId = randomUUID();
    const started = Date.now();
    const log: LogFields = { request_id: requestId, http_method: req.method, route: 'other' };
    res.setHeader('x-request-id', requestId);
    try {
      await handle(req, res, requestId, log);
    } catch (error) {
      log.outcome = 'internal_error';
      log.error_name = describeError(error).error_name;
      if (!res.headersSent) protocolError(res, 500, 'Internal server error');
      else res.end();
    } finally {
      const status = res.statusCode;
      const fields = { ...log, status, duration_ms: Date.now() - started };
      if (status >= 500) logger.error('request_completed', fields);
      else if (status >= 400) logger.warn('request_completed', fields);
      else logger.info('request_completed', fields);
    }
  };
}
