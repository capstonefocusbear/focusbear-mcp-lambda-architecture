import { createPrivateKey, createPublicKey, randomUUID } from 'crypto';
import * as jwt from 'jsonwebtoken';
import {
  ACCESS_TOKEN_TYPE,
  JWT_ASSERTION_TYPE,
  MCP_ADAPTER_CLIENT,
  TOKEN_EXCHANGE_GRANT,
  validateMcpClaims,
} from '../../../../libs/jwt/src/mcp-claims';
import { AdapterConfig } from './config';
import { BackendCredentialProvider, BackendError } from './backend';

async function boundedJson(response: Response): Promise<any> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('missing_body');
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      // biome-ignore lint/performance/noAwaitInLoops: stream chunks must be read in order
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > 65536) throw new Error('too_large');
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } finally {
    await reader.cancel();
  }
}

export function createExchangeProvider(config: AdapterConfig, env = process.env): BackendCredentialProvider {
  if (!env.MCP_ADAPTER_SIGNING_PRIVATE_KEY || !env.MCP_ADAPTER_SIGNING_KID)
    throw new Error('MCP adapter signing credentials are required');
  const privateKey = createPrivateKey(env.MCP_ADAPTER_SIGNING_PRIVATE_KEY.replace(/\\n/g, '\n'));
  if (privateKey.asymmetricKeyType !== 'rsa' || (privateKey.asymmetricKeyDetails?.modulusLength || 0) < 2048)
    throw new Error('MCP adapter requires an RSA key of at least 2048 bits');
  const endpoint = new URL('oauth/token', config.issuer).toString();
  const resource = new URL('/mcp/tasks', config.backendUrl).toString();
  return {
    async getToken(clientToken, context) {
      const now = Math.floor(Date.now() / 1000);
      if (context.expiresAt <= now) throw new BackendError('backend_unauthorized', 401);
      const scope = [...context.scopes].join(' ');
      const assertion = jwt.sign(
        { iss: MCP_ADAPTER_CLIENT, sub: MCP_ADAPTER_CLIENT, aud: endpoint, iat: now, exp: now + 60, jti: randomUUID() },
        privateKey,
        { algorithm: 'RS256', keyid: env.MCP_ADAPTER_SIGNING_KID },
      );
      let response: Response;
      try {
        response = await fetch(endpoint, {
          method: 'POST',
          redirect: 'error',
          signal: AbortSignal.timeout(5000),
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: TOKEN_EXCHANGE_GRANT,
            subject_token: clientToken,
            subject_token_type: ACCESS_TOKEN_TYPE,
            requested_token_type: ACCESS_TOKEN_TYPE,
            resource,
            scope,
            client_id: MCP_ADAPTER_CLIENT,
            client_assertion_type: JWT_ASSERTION_TYPE,
            client_assertion: assertion,
          }).toString(),
        });
      } catch {
        throw new BackendError('backend_transport_error', 503);
      }
      if (!response.ok) {
        await response.body?.cancel();
        const code =
          response.status === 401 || response.status === 400
            ? 'backend_unauthorized'
            : response.status === 429
            ? 'rate_limited'
            : 'backend_unavailable';
        throw new BackendError(code, code === 'backend_unauthorized' ? 401 : code === 'rate_limited' ? 429 : 503);
      }
      try {
        const body = await boundedJson(response);
        if (
          body.token_type !== 'Bearer' ||
          body.issued_token_type !== ACCESS_TOKEN_TYPE ||
          typeof body.access_token !== 'string' ||
          body.access_token === clientToken ||
          body.scope !== scope ||
          !Number.isInteger(body.expires_in) ||
          body.expires_in <= 0 ||
          body.expires_in > 60
        )
          throw new Error('invalid_response');
        const decoded = jwt.decode(body.access_token, { complete: true });
        if (
          !decoded ||
          decoded.header.alg !== 'RS256' ||
          decoded.header.typ !== 'at+jwt' ||
          typeof decoded.header.kid !== 'string'
        )
          throw new Error('invalid_token');
        const jwksResponse = await fetch(config.jwksUrl, { redirect: 'error', signal: AbortSignal.timeout(3000) });
        if (!jwksResponse.ok) {
          await jwksResponse.body?.cancel();
          throw new Error('jwks_unavailable');
        }
        const jwks = await boundedJson(jwksResponse);
        const matches = jwks.keys.filter((key: any) => key.kid === decoded.header.kid && key.kty === 'RSA');
        if (matches.length !== 1) throw new Error('invalid_key');
        const claims = validateMcpClaims(
          jwt.verify(body.access_token, createPublicKey({ key: matches[0], format: 'jwk' }), {
            algorithms: ['RS256'],
            issuer: config.issuer,
            audience: resource,
            clockTolerance: 0,
          }) as jwt.JwtPayload,
          resource,
          60,
        );
        if (
          claims.sub !== context.subject ||
          claims.grant_id !== context.grantId ||
          claims.client_id !== MCP_ADAPTER_CLIENT ||
          claims.act?.sub !== MCP_ADAPTER_CLIENT ||
          claims.scope !== scope ||
          claims.exp > context.expiresAt ||
          body.expires_in !== claims.exp - claims.iat
        )
          throw new Error('invalid_delegation');
        return { token: body.access_token };
      } catch {
        throw new BackendError('bad_backend_response', 502);
      }
    },
  };
}
