import { createMcpAuthVerifier, McpIdentity } from '../../../../libs/jwt/src/mcp-auth0';
import { AdapterConfig } from './config';

export type VerifiedToken = McpIdentity;

export interface TokenVerifier {
  verify(token: string): Promise<VerifiedToken>;
}

export function createTokenVerifier(config: AdapterConfig): TokenVerifier {
  return createMcpAuthVerifier({
    issuer: config.issuer,
    audience: config.resourceUrl,
    jwksUrl: config.jwksUrl,
    allowedClients: config.allowedClients,
    tokenProfile: config.tokenProfile,
    allowLocalHttp: config.allowLocalHttp,
    maxTokenLifetimeSeconds: config.maxTokenLifetimeSeconds,
  });
}
