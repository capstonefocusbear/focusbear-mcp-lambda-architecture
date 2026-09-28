import jwt = require('jsonwebtoken');
import jwksClient = require('jwks-rsa');
import { JwtPayload } from 'jsonwebtoken';
import { AdapterConfig } from './config';

export interface VerifiedToken {
  subject: string;
  scopes: Set<string>;
}

export interface TokenVerifier {
  verify(token: string): Promise<VerifiedToken>;
}

export function createTokenVerifier(config: AdapterConfig): TokenVerifier {
  const client = jwksClient({
    jwksUri: config.jwksUrl,
    cache: true,
    cacheMaxAge: 600_000,
    rateLimit: true,
    jwksRequestsPerMinute: 10,
    timeout: 3000,
  });
  return {
    async verify(token: string): Promise<VerifiedToken> {
      const decoded = jwt.decode(token, { complete: true });
      if (!decoded || typeof decoded === 'string' || decoded.header.alg !== 'RS256' || !decoded.header.kid)
        throw new Error('invalid_token');
      const key = await client.getSigningKey(decoded.header.kid);
      const payload = jwt.verify(token, key.getPublicKey(), {
        algorithms: ['RS256'],
        issuer: config.issuer,
        audience: config.resourceUrl,
        clockTolerance: 0,
      }) as JwtPayload;
      if (
        typeof payload.sub !== 'string' ||
        !payload.sub ||
        typeof payload.exp !== 'number' ||
        typeof payload.scope !== 'string'
      )
        throw new Error('invalid_token');
      return { subject: payload.sub, scopes: new Set(payload.scope.split(/\s+/).filter(Boolean)) };
    },
  };
}
