import jwt = require('jsonwebtoken');
import jwksClient = require('jwks-rsa');

export interface McpAuthConfig {
  issuer: string;
  audience: string;
  jwksUrl: string;
  allowedClients: string[];
  tokenProfile: 'auth0' | 'rfc9068';
  allowLocalHttp: boolean;
  maxTokenLifetimeSeconds?: number;
}

export interface McpIdentity {
  subject: string;
  issuer: string;
  clientId: string;
  expiresAt: number;
  scopes: Set<string>;
}

export interface McpAuthVerifier {
  verify(token: string): Promise<McpIdentity>;
}

/** Explicit test network names only. Never enabled in production. */
export function isMcpLocalHost(hostname: string): boolean {
  return (
    [
      'localhost',
      '127.0.0.1',
      '[::1]',
      '::1',
      'api-server',
      'auth-fixture',
      'localstack',
      'host.docker.internal',
    ].includes(hostname) || hostname.endsWith('.localhost.localstack.cloud')
  );
}

export function checkedMcpUrl(value: string, name: string, allowLocalHttp: boolean): URL {
  const url = new URL(value);
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    (url.protocol !== 'https:' && !(allowLocalHttp && url.protocol === 'http:' && isMcpLocalHost(url.hostname)))
  ) {
    throw new Error(`${name} must be HTTPS without credentials, query or fragment`);
  }
  if (!allowLocalHttp && isMcpLocalHost(url.hostname)) throw new Error(`${name} cannot use a local host`);
  return url;
}

export function loadMcpAuthConfig(env: NodeJS.ProcessEnv = process.env): McpAuthConfig {
  const required = (name: string): string => {
    const value = env[name]?.trim();
    if (!value) throw new Error(`${name} is required`);
    return value;
  };
  if (env.MCP_ALLOW_LOCAL_HTTP === 'true' && env.NODE_ENV === 'production') {
    throw new Error('MCP_ALLOW_LOCAL_HTTP is forbidden in production');
  }
  const allowLocalHttp = env.MCP_ALLOW_LOCAL_HTTP === 'true' && env.NODE_ENV !== 'production';
  const issuer = checkedMcpUrl(required('OAUTH_ISSUER'), 'OAUTH_ISSUER', allowLocalHttp);
  if (issuer.pathname !== '/') throw new Error('OAUTH_ISSUER must be an origin with trailing slash');
  const issuerValue = required('OAUTH_ISSUER');
  if (issuerValue !== issuer.toString()) throw new Error('OAUTH_ISSUER must be canonical with trailing slash');
  const audience = checkedMcpUrl(required('MCP_RESOURCE_URL'), 'MCP_RESOURCE_URL', allowLocalHttp);
  if (audience.pathname !== '/mcp' || audience.toString() !== required('MCP_RESOURCE_URL')) {
    throw new Error('MCP_RESOURCE_URL must be the canonical /mcp URL');
  }
  if (env.AUTH0_IDENTIFIER === audience.toString()) throw new Error('MCP and normal API audiences must differ');
  const jwksUrl = checkedMcpUrl(
    env.OAUTH_JWKS_URL?.trim() || new URL('/.well-known/jwks.json', issuer).toString(),
    'OAUTH_JWKS_URL',
    allowLocalHttp,
  );
  if (jwksUrl.origin !== issuer.origin) throw new Error('OAUTH_JWKS_URL must belong to the configured issuer');
  const allowedClients = required('MCP_ALLOWED_CLIENT_IDS')
    .split(',')
    .map((value) => value.trim());
  if (
    allowedClients.some((value) => !/^[A-Za-z0-9_-]{1,256}$/.test(value)) ||
    new Set(allowedClients).size !== allowedClients.length
  )
    throw new Error('MCP_ALLOWED_CLIENT_IDS must be distinct client IDs');
  const tokenProfile = env.MCP_TOKEN_PROFILE || 'auth0';
  if (tokenProfile !== 'auth0' && tokenProfile !== 'rfc9068')
    throw new Error('MCP_TOKEN_PROFILE must be auth0 or rfc9068');
  const maxTokenLifetimeSeconds = Number(env.MCP_MAX_TOKEN_LIFETIME_SECONDS || 900);
  if (
    !Number.isSafeInteger(maxTokenLifetimeSeconds) ||
    maxTokenLifetimeSeconds < 60 ||
    maxTokenLifetimeSeconds > 3600
  ) {
    throw new Error('MCP_MAX_TOKEN_LIFETIME_SECONDS must be between 60 and 3600');
  }
  return {
    issuer: issuerValue,
    audience: audience.toString(),
    jwksUrl: jwksUrl.toString(),
    allowedClients,
    tokenProfile,
    allowLocalHttp,
    maxTokenLifetimeSeconds,
  };
}

/** Called only after signature verification by the verifier below. Exported for contract tests. */
export function validateMcpIdentity(payload: jwt.JwtPayload, config: McpAuthConfig): McpIdentity {
  const now = Math.floor(Date.now() / 1000);
  const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  const clientId = config.tokenProfile === 'auth0' ? payload.azp : payload.client_id;
  if (
    payload.iss !== config.issuer ||
    audiences.length !== 1 ||
    audiences[0] !== config.audience ||
    typeof payload.sub !== 'string' ||
    !payload.sub ||
    payload.sub.length > 256 ||
    payload.sub.endsWith('@clients') ||
    typeof clientId !== 'string' ||
    !config.allowedClients.includes(clientId) ||
    payload.sub === clientId ||
    payload.gty === 'client-credentials' ||
    payload.gty === 'client_credentials' ||
    payload.act !== undefined ||
    !Number.isSafeInteger(payload.iat) ||
    !Number.isSafeInteger(payload.exp) ||
    payload.iat > now ||
    payload.exp <= now ||
    payload.exp <= payload.iat ||
    payload.exp - payload.iat > (config.maxTokenLifetimeSeconds ?? 900) ||
    (payload.nbf !== undefined && (!Number.isSafeInteger(payload.nbf) || payload.nbf > now)) ||
    typeof payload.scope !== 'string' ||
    !/^[\x21-\x7e]+(?: [\x21-\x7e]+)*$/.test(payload.scope) ||
    (config.tokenProfile === 'rfc9068' && (typeof payload.jti !== 'string' || !payload.jti))
  ) {
    throw new Error('invalid_token');
  }
  return {
    subject: payload.sub,
    issuer: config.issuer,
    clientId,
    expiresAt: payload.exp,
    scopes: new Set(payload.scope.split(' ')),
  };
}

export function createMcpAuthVerifier(
  config: McpAuthConfig,
  resolvePublicKey?: (kid: string) => Promise<string>,
): McpAuthVerifier {
  const client = jwksClient({
    jwksUri: config.jwksUrl,
    cache: true,
    cacheMaxEntries: 5,
    cacheMaxAge: 600_000,
    rateLimit: true,
    jwksRequestsPerMinute: 10,
    timeout: 3000,
  });
  const keyFor = resolvePublicKey || (async (kid: string) => (await client.getSigningKey(kid)).getPublicKey());
  return {
    async verify(token: string): Promise<McpIdentity> {
      if (typeof token !== 'string' || token.length > 16_384) throw new Error('invalid_token');
      const decoded = jwt.decode(token, { complete: true });
      const expectedType = config.tokenProfile === 'auth0' ? 'JWT' : 'at+jwt';
      if (
        !decoded ||
        typeof decoded === 'string' ||
        decoded.header.alg !== 'RS256' ||
        decoded.header.typ !== expectedType ||
        typeof decoded.header.kid !== 'string' ||
        !decoded.header.kid ||
        decoded.header.kid.length > 256
      )
        throw new Error('invalid_token');
      const key = await keyFor(decoded.header.kid);
      const payload = jwt.verify(token, key, {
        algorithms: ['RS256'],
        issuer: config.issuer,
        audience: config.audience,
        clockTolerance: 0,
      }) as jwt.JwtPayload;
      return validateMcpIdentity(payload, config);
    },
  };
}
