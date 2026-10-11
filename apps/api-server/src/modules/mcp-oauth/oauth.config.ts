import { createPrivateKey, createPublicKey, KeyObject } from 'crypto';

export const MCP_SCOPES = ['mcp.tasks.read', 'mcp.tasks.write'];
export const LOCAL_CLIENT = {
  client_id: 'focusbear-inspector-local',
  redirect_uri: 'http://127.0.0.1:6276/oauth/callback',
};

export interface OAuthConfig {
  issuer: string;
  resource: string;
  client: typeof LOCAL_CLIENT;
  privateKey: KeyObject;
  kid: string;
  jwks: { keys: Record<string, unknown>[] };
  apiResource: string;
  adapterJwks: { keys: Record<string, unknown>[] };
  auth0Issuer: string;
  auth0ClientId: string;
  auth0ClientSecret: string;
}

export function loadOAuthConfig(env = process.env): OAuthConfig | undefined {
  if (env.MCP_OAUTH_ENABLED !== 'true') return undefined;
  const issuer = env.OAUTH_ISSUER;
  const resource = env.MCP_RESOURCE_URL;
  const local = env.NODE_ENV !== 'production' && issuer === 'http://127.0.0.1:5038/';
  const url = (value: string, allowLocal = false) => {
    const parsed = new URL(value);
    if (
      parsed.username ||
      parsed.password ||
      parsed.search ||
      parsed.hash ||
      (parsed.protocol !== 'https:' && !(allowLocal && parsed.protocol === 'http:' && parsed.hostname === '127.0.0.1'))
    )
      throw new Error('Invalid OAuth URL configuration');
    return parsed;
  };
  if (!issuer?.endsWith('/') || url(issuer, local).pathname !== '/') throw new Error('Invalid OAuth issuer');
  url(resource, local);
  if (local && resource !== 'http://127.0.0.1:5039/mcp') throw new Error('Invalid local MCP resource');
  if (!/^[a-f0-9]{64}$/i.test(env.OAUTH_STATE_ENCRYPTION_KEY || ''))
    throw new Error('Missing OAuth state encryption key');
  const client = local
    ? LOCAL_CLIENT
    : {
        client_id: env.MCP_OAUTH_CLIENT_ID,
        redirect_uri: env.MCP_OAUTH_REDIRECT_URI,
      };
  if (!client.client_id || !client.redirect_uri) throw new Error('Missing OAuth client registration');
  url(client.redirect_uri, local);
  if (
    !env.OAUTH_SIGNING_KID ||
    !env.OAUTH_SIGNING_PRIVATE_KEY ||
    !env.MCP_AUTH0_CLIENT_ID ||
    !env.MCP_AUTH0_CLIENT_SECRET ||
    !env.AUTH0_DOMAIN
  )
    throw new Error('Missing OAuth configuration');
  const privateKey = createPrivateKey(env.OAUTH_SIGNING_PRIVATE_KEY.replace(/\\n/g, '\n'));
  if (privateKey.asymmetricKeyType !== 'rsa' || (privateKey.asymmetricKeyDetails?.modulusLength || 0) < 2048)
    throw new Error('OAuth requires an RSA key of at least 2048 bits');
  const publicJwk = createPublicKey(privateKey).export({ format: 'jwk' });
  const keys: Record<string, unknown>[] = [{ ...publicJwk, kid: env.OAUTH_SIGNING_KID, alg: 'RS256', use: 'sig' }];
  // Only public RSA keys may be retained for overlap during rotation.
  const overlap = JSON.parse(env.OAUTH_PREVIOUS_PUBLIC_JWKS || '{"keys":[]}');
  if (!Array.isArray(overlap.keys)) throw new Error('Invalid OAuth JWKS');
  for (const key of overlap.keys) {
    if (
      key.kty !== 'RSA' ||
      !key.kid ||
      keys.some((k) => k.kid === key.kid) ||
      !key.n ||
      !key.e ||
      Object.keys(key).some((k) => ['d', 'p', 'q', 'dp', 'dq', 'qi', 'oth'].includes(k))
    )
      throw new Error('Invalid OAuth public key');
    keys.push({ kty: 'RSA', n: key.n, e: key.e, kid: key.kid, alg: 'RS256', use: 'sig' });
  }
  const apiResource = env.OAUTH_API_RESOURCE_URL || `${issuer}mcp/tasks`;
  url(apiResource, local);
  if (apiResource !== `${issuer}mcp/tasks`) throw new Error('Invalid API resource');
  const adapterJwks = JSON.parse(env.OAUTH_ADAPTER_PUBLIC_JWKS || '{"keys":[]}');
  if (!Array.isArray(adapterJwks.keys)) throw new Error('Invalid adapter JWKS');
  const adapterKids = new Set<string>();
  for (const key of adapterJwks.keys) {
    if (
      key.kty !== 'RSA' ||
      typeof key.kid !== 'string' ||
      !key.kid ||
      adapterKids.has(key.kid) ||
      !key.n ||
      !key.e ||
      Object.keys(key).some((k) => ['d', 'p', 'q', 'dp', 'dq', 'qi', 'oth'].includes(k))
    )
      throw new Error('Invalid adapter public key');
    const publicKey = createPublicKey({ key, format: 'jwk' });
    if ((publicKey.asymmetricKeyDetails?.modulusLength || 0) < 2048) throw new Error('Invalid adapter RSA key');
    adapterKids.add(key.kid);
  }
  const auth0Issuer = `https://${env.AUTH0_DOMAIN}/`;
  if (url(auth0Issuer).pathname !== '/') throw new Error('Invalid Auth0 domain');
  return {
    issuer,
    resource,
    client,
    privateKey,
    kid: env.OAUTH_SIGNING_KID,
    jwks: { keys },
    apiResource,
    adapterJwks,
    auth0Issuer,
    auth0ClientId: env.MCP_AUTH0_CLIENT_ID,
    auth0ClientSecret: env.MCP_AUTH0_CLIENT_SECRET,
  };
}
