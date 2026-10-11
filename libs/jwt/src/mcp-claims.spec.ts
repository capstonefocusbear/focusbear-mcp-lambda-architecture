import { validateMcpClaims } from './mcp-claims';

describe('MCP access claim types', () => {
  it.each([['11111111-1111-4111-8111-111111111111'], { id: '11111111-1111-4111-8111-111111111111' }])(
    'rejects a non-string subject %j',
    (sub) => {
      const now = Math.floor(Date.now() / 1000);
      const claims = {
        sub,
        grant_id: '22222222-2222-4222-8222-222222222222',
        client_id: 'public-client',
        jti: 'token-1',
        scope: 'mcp.tasks.read',
        iat: now,
        exp: now + 300,
        aud: 'https://mcp.example/mcp',
      };
      expect(() => validateMcpClaims(claims as any, 'https://mcp.example/mcp', 300)).toThrow('invalid_token');
    },
  );
});
