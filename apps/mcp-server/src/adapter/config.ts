import { checkedMcpUrl, loadMcpAuthConfig } from '../../../../libs/jwt/src/mcp-auth0';

export interface AdapterConfig {
  resourceUrl: string;
  issuer: string;
  jwksUrl: string;
  backendUrl: string;
  allowedOrigins: string[];
  allowLocalHttp: boolean;
  allowedClients: string[];
  tokenProfile: 'auth0' | 'rfc9068';
  maxTokenLifetimeSeconds?: number;
  trustedInternalHosts?: string[];
}

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function checkedUrl(value: string, name: string, allowLocalHttp: boolean): string {
  return checkedMcpUrl(value, name, allowLocalHttp).toString();
}

export function loadAdapterConfig(): AdapterConfig {
  const auth = loadMcpAuthConfig();
  const allowLocalHttp = auth.allowLocalHttp;
  const resourceUrl = checkedUrl(auth.audience, 'MCP_RESOURCE_URL', allowLocalHttp);
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
  const trustedInternalHosts = (process.env.MCP_TRUSTED_INTERNAL_HOSTS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (
    trustedInternalHosts.some(
      (host) =>
        !/^(?:127\.0\.0\.1|localhost|\[::1\]):[0-9]{1,5}$/.test(host) ||
        Number(host.slice(host.lastIndexOf(':') + 1)) < 1 ||
        Number(host.slice(host.lastIndexOf(':') + 1)) > 65535,
    )
  )
    throw new Error('MCP_TRUSTED_INTERNAL_HOSTS must contain explicit loopback host:port values');
  return {
    resourceUrl,
    issuer: auth.issuer,
    jwksUrl: auth.jwksUrl,
    allowedClients: auth.allowedClients,
    tokenProfile: auth.tokenProfile,
    maxTokenLifetimeSeconds: auth.maxTokenLifetimeSeconds,
    trustedInternalHosts,
    backendUrl,
    allowedOrigins: allowedOrigins.map((origin) => new URL(origin).origin),
    allowLocalHttp,
  };
}

export function metadataUrl(config: AdapterConfig): string {
  return new URL('/.well-known/oauth-protected-resource/mcp', config.resourceUrl).toString();
}
