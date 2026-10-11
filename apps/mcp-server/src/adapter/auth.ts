import { validateMcpClaims } from '../../../../libs/jwt/src/mcp-claims';
import jwt = require('jsonwebtoken');
import jwksClient = require('jwks-rsa');
import { JwtPayload } from 'jsonwebtoken';
import { AdapterConfig } from './config';

export interface VerifiedToken {
  subject: string;
  grantId: string;
  clientId: string;
  expiresAt: number;
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
      if (
        !decoded ||
        typeof decoded === 'string' ||
        decoded.header.alg !== 'RS256' ||
        !decoded.header.kid ||
        decoded.header.typ !== 'at+jwt'
      )
        throw new Error('invalid_token');
      const key = await client.getSigningKey(decoded.header.kid);
      const payload = jwt.verify(token, key.getPublicKey(), {
        algorithms: ['RS256'],
        issuer: config.issuer,
        audience: config.resourceUrl,
        clockTolerance: 0,
      }) as JwtPayload;
      const claims = validateMcpClaims(payload, config.resourceUrl, 300);
      if (claims.act !== undefined) throw new Error('invalid_token');
      return {
        subject: claims.sub,
        grantId: claims.grant_id,
        clientId: claims.client_id,
        expiresAt: claims.exp,
        scopes: new Set(claims.scope.split(' ')),
      };
    },
  };
}
