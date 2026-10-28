import { randomUUID } from 'node:crypto';
import { IncomingMessage, ServerResponse } from 'node:http';
import { dispatchRequest, PROTOCOL_VERSION } from './transport';
import { AdapterConfig, metadataUrl } from './config';
import { TokenVerifier } from './auth';
import { BackendClient } from './backend';
import { toolScopes, validateToolCall } from './tools';

export interface AdapterDependencies {
  config: AdapterConfig;
  verifier: TokenVerifier;
  backend: BackendClient;
  telemetry?: (event: {
    request_id: string;
    status: number;
    duration_ms: number;
    method: string;
    tool?: string;
  }) => void;
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
  code = -32600,
  id?: string | number,
  data?: unknown,
): void {
  json(
    res,
    status,
    {
      jsonrpc: '2.0',
      error: { code, message, ...(data === undefined ? {} : { data }) },
      ...(id === undefined ? {} : { id }),
    },
    headers,
  );
}

async function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    const cleanup = () => {
      clearTimeout(timer);
      req.removeListener('data', onData);
      req.removeListener('end', onEnd);
      req.removeListener('error', onError);
      req.removeListener('aborted', onAborted);
    };
    const fail = (error: Error) => {
      cleanup();
      req.pause();
      reject(error);
    };
    const onError = (error: Error) => fail(error);
    const onAborted = () => fail(new Error('aborted'));
    const onData = (chunk: Buffer | string) => {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      size += buffer.length;
      if (size > 1_048_576) {
        fail(new Error('too_large'));
        return;
      }
      chunks.push(buffer);
    };
    const onEnd = () => {
      cleanup();
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(new Error('invalid_json'));
      }
    };
    const timer = setTimeout(() => fail(new Error('body_timeout')), 1000);
    req.on('data', onData).once('end', onEnd).once('error', onError).once('aborted', onAborted);
  });
}

function accepts(accept: string, type: string): boolean {
  return accept.split(',').some((entry) => {
    const [media, ...parameters] = entry.trim().toLowerCase().split(';');
    if (media.trim() !== type) return false;
    const quality = parameters.find((value) => value.trim().startsWith('q='));
    return (
      quality === undefined ||
      (/^q=(?:0(?:\.[0-9]{0,3})?|1(?:\.0{0,3})?)$/.test(quality.trim()) && Number(quality.trim().slice(2)) > 0)
    );
  });
}

function challenge(config: AdapterConfig, scope?: string, error?: string): string {
  const fields = [`resource_metadata="${metadataUrl(config)}"`];
  if (scope) fields.push(`scope="${scope}"`);
  if (error) fields.push(`error="${error}"`);
  return `Bearer ${fields.join(', ')}`;
}

export function createAdapterHandler({ config, verifier, backend, telemetry }: AdapterDependencies) {
  const resourceOrigin = new URL(config.resourceUrl).origin;
  const expectedHost = new URL(config.resourceUrl).host;
  const handle = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const requestId = randomUUID();
    const start = Date.now();
    let rpcMethod = 'http';
    let tool: string | undefined;
    res.once('finish', () => {
      try {
        telemetry?.({
          request_id: requestId,
          status: res.statusCode,
          duration_ms: Date.now() - start,
          method: rpcMethod,
          ...(tool ? { tool } : {}),
        });
      } catch {
        /* Telemetry must not change authorization or responses. */
      }
    });
    res.setHeader('x-request-id', requestId);
    const origin = req.headers.origin;
    if (origin && origin !== resourceOrigin && !config.allowedOrigins.includes(origin)) {
      protocolError(res, 403, 'Forbidden');
      return;
    }
    if (
      !req.headers.host ||
      (req.headers.host !== expectedHost && !config.trustedInternalHosts?.includes(req.headers.host))
    ) {
      protocolError(res, 403, 'Forbidden');
      return;
    }
    if (origin && config.allowedOrigins.includes(origin)) {
      res.setHeader('access-control-allow-origin', origin);
      res.setHeader('access-control-expose-headers', 'WWW-Authenticate, X-Request-Id');
      res.setHeader('vary', 'Origin');
    }
    let path: string;
    try {
      path = new URL(req.url || '/', config.resourceUrl).pathname;
    } catch {
      protocolError(res, 400, 'Invalid request target');
      return;
    }
    if (
      ['/.well-known/oauth-protected-resource', '/.well-known/oauth-protected-resource/mcp'].includes(path) &&
      req.method === 'GET'
    ) {
      json(res, 200, {
        resource: config.resourceUrl,
        authorization_servers: [config.issuer],
        scopes_supported: ['mcp.tasks.read', 'mcp.tasks.write', 'mcp.summary.read'],
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
        'access-control-allow-methods': 'POST, OPTIONS',
        'access-control-allow-headers':
          'authorization, content-type, accept, mcp-protocol-version, mcp-method, mcp-name',
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
        'www-authenticate': challenge(config, 'mcp.tasks.read mcp.tasks.write mcp.summary.read'),
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
    if (!accepts(accept, 'application/json') || !accepts(accept, 'text/event-stream')) {
      protocolError(res, 406, 'Not acceptable');
      return;
    }
    let body: any;
    try {
      body = await readBody(req);
    } catch (error) {
      const reason = error instanceof Error ? error.message : '';
      protocolError(res, reason === 'too_large' ? 413 : reason === 'body_timeout' ? 408 : 400, 'Invalid request body', {
        connection: 'close',
      });
      return;
    }
    if (
      !body ||
      typeof body !== 'object' ||
      Array.isArray(body) ||
      body.jsonrpc !== '2.0' ||
      typeof body.method !== 'string' ||
      !(typeof body.id === 'string' || (typeof body.id === 'number' && Number.isSafeInteger(body.id)))
    ) {
      protocolError(res, 400, 'Invalid JSON-RPC request');
      return;
    }
    rpcMethod = ['tools/list', 'tools/call', 'server/discover'].includes(body.method) ? body.method : 'unknown';
    const meta = body.params?._meta;
    if (
      !meta ||
      typeof meta['io.modelcontextprotocol/protocolVersion'] !== 'string' ||
      !meta['io.modelcontextprotocol/clientCapabilities'] ||
      typeof meta['io.modelcontextprotocol/clientCapabilities'] !== 'object' ||
      Array.isArray(meta['io.modelcontextprotocol/clientCapabilities'])
    ) {
      protocolError(res, 400, 'Missing required request metadata', {}, -32602, body.id);
      return;
    }
    const version = req.headers['mcp-protocol-version'];
    const name = req.headers['mcp-name'];
    let decodedName = name;
    if (typeof name === 'string' && name.startsWith('=?base64?') && name.endsWith('?=')) {
      const encoded = name.slice(9, -2);
      const decoded = Buffer.from(encoded, 'base64');
      decodedName = decoded.toString('utf8');
      if (decoded.toString('base64') !== encoded || Buffer.from(decodedName).compare(decoded) !== 0)
        decodedName = undefined;
    }
    const namedMethod = ['tools/call', 'resources/read', 'prompts/get'].includes(body.method);
    const bodyName = body.method === 'resources/read' ? body.params?.uri : body.params?.name;
    if (
      typeof version !== 'string' ||
      version !== meta['io.modelcontextprotocol/protocolVersion'] ||
      req.headers['mcp-method'] !== body.method ||
      (namedMethod && (typeof decodedName !== 'string' || decodedName !== bodyName))
    ) {
      protocolError(res, 400, 'Header mismatch', {}, -32020, body.id);
      return;
    }
    if (version !== PROTOCOL_VERSION) {
      protocolError(res, 400, 'Unsupported protocol version', {}, -32022, body.id, {
        supported: [PROTOCOL_VERSION],
        requested: version,
      });
      return;
    }
    if (!['server/discover', 'tools/list', 'tools/call', 'ping'].includes(body.method)) {
      protocolError(res, 404, 'Method not found; supported protocol version: 2026-07-28', {}, -32601, body.id);
      return;
    }
    if (body.method === 'tools/call') {
      const name = body.params?.name;
      const scope = Object.prototype.hasOwnProperty.call(toolScopes, name) ? toolScopes[name] : undefined;
      if (!scope) {
        protocolError(res, 400, 'Unknown tool', {}, -32602, body.id);
        return;
      }
      tool = name;
      if (!verified.scopes.has(scope)) {
        protocolError(
          res,
          403,
          'Insufficient scope',
          {
            'www-authenticate': challenge(config, scope, 'insufficient_scope'),
          },
          -32600,
          body.id,
        );
        return;
      }
      if (!validateToolCall(name, body.params?.arguments)) {
        protocolError(res, 400, 'Invalid tool arguments', {}, -32602, body.id);
        return;
      }
    }
    try {
      const response = await dispatchRequest(body, {
        clientToken: match[1],
        verifiedToken: verified,
        requestId,
        backend,
      });
      json(res, 200, response);
    } catch {
      if (!res.headersSent) protocolError(res, 500, 'Internal server error', {}, -32603, body.id);
    }
  };
  // Node HTTP listeners do not await promises. Contain every handler rejection
  // here so malformed input or an unexpected failure cannot exit the process.
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    try {
      await handle(req, res);
    } catch {
      try {
        if (!res.headersSent && !res.writableEnded && !res.destroyed) {
          protocolError(res, 500, 'Internal server error', {}, -32603);
        } else if (!res.writableEnded) {
          res.destroy();
        }
      } catch {
        // A failed response cannot be repaired; close without exposing details.
        res.destroy();
      }
    }
  };
}
