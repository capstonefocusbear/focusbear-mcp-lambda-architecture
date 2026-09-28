export interface AdapterConfig {
  resourceUrl: string;
  issuer: string;
  jwksUrl: string;
  backendUrl: string;
  allowedOrigins: string[];
  allowLocalHttp: boolean;
}

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function checkedUrl(value: string, name: string, allowLocalHttp: boolean): string {
  const url = new URL(value);
  const local = ['localhost', '127.0.0.1', '::1', '[::1]'].includes(url.hostname);
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    (url.protocol !== 'https:' && !(allowLocalHttp && local && url.protocol === 'http:'))
  ) {
    throw new Error(`${name} must be an HTTPS URL without credentials, query, or fragment`);
  }
  return url.toString();
}

export function loadAdapterConfig(): AdapterConfig {
  const allowLocalHttp = process.env.MCP_ALLOW_LOCAL_HTTP === 'true' && process.env.NODE_ENV !== 'production';
  const resourceUrl = checkedUrl(required('MCP_RESOURCE_URL'), 'MCP_RESOURCE_URL', allowLocalHttp);
  if (new URL(resourceUrl).pathname !== '/mcp') throw new Error('MCP_RESOURCE_URL must end in /mcp');
  const backendUrl = checkedUrl(required('API_SERVER_URL'), 'API_SERVER_URL', allowLocalHttp);
  if (new URL(backendUrl).pathname !== '/') throw new Error('API_SERVER_URL must be an origin');
  const allowedOrigins = (process.env.MCP_ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => checkedUrl(s, 'MCP_ALLOWED_ORIGINS', allowLocalHttp));
  if (allowedOrigins.some((origin) => new URL(origin).origin + '/' !== origin))
    throw new Error('MCP_ALLOWED_ORIGINS must contain origins only');
  return {
    resourceUrl,
    issuer: checkedUrl(required('OAUTH_ISSUER'), 'OAUTH_ISSUER', allowLocalHttp),
    jwksUrl: checkedUrl(required('OAUTH_JWKS_URL'), 'OAUTH_JWKS_URL', allowLocalHttp),
    backendUrl,
    allowedOrigins: allowedOrigins.map((origin) => new URL(origin).origin),
    allowLocalHttp,
  };
}

export function metadataUrl(config: AdapterConfig): string {
  return new URL('/.well-known/oauth-protected-resource', config.resourceUrl).toString();
}
