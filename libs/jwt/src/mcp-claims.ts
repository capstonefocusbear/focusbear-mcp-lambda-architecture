import { JwtPayload } from 'jsonwebtoken';

export const MCP_TASK_SCOPES = ['mcp.tasks.read', 'mcp.tasks.write'];
export const MCP_ADAPTER_CLIENT = 'focusbear-mcp-adapter';
export const TOKEN_EXCHANGE_GRANT = 'urn:ietf:params:oauth:grant-type:token-exchange';
export const ACCESS_TOKEN_TYPE = 'urn:ietf:params:oauth:token-type:access_token';
export const JWT_ASSERTION_TYPE = 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface McpAccessClaims extends JwtPayload {
  sub: string;
  client_id: string;
  grant_id: string;
  scope: string;
  iat: number;
  exp: number;
  jti: string;
}

// Call only after verifying signature, algorithm, issuer, and audience.
export function validateMcpClaims(payload: JwtPayload, audience: string, maxLifetime: number): McpAccessClaims {
  const now = Math.floor(Date.now() / 1000);
  if (
    payload.aud !== audience ||
    typeof payload.sub !== 'string' ||
    !uuid.test(payload.sub) ||
    typeof payload.grant_id !== 'string' ||
    !uuid.test(payload.grant_id) ||
    typeof payload.client_id !== 'string' ||
    !payload.client_id ||
    payload.client_id.length > 256 ||
    typeof payload.jti !== 'string' ||
    !payload.jti ||
    payload.jti.length > 256 ||
    !Number.isInteger(payload.iat) ||
    !Number.isInteger(payload.exp) ||
    payload.iat > now ||
    payload.exp <= now ||
    payload.exp <= payload.iat ||
    payload.exp - payload.iat > maxLifetime ||
    (payload.nbf !== undefined && (!Number.isInteger(payload.nbf) || payload.nbf > now)) ||
    typeof payload.scope !== 'string' ||
    !payload.scope ||
    payload.scope.split(' ').some((scope) => !MCP_TASK_SCOPES.includes(scope)) ||
    new Set(payload.scope.split(' ')).size !== payload.scope.split(' ').length
  )
    throw new Error('invalid_token');
  return payload as McpAccessClaims;
}
