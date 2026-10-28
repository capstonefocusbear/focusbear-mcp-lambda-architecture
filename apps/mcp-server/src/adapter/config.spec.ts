import { loadAdapterConfig } from './config';

describe('adapter configuration', () => {
  const originalEnv = process.env;
  beforeEach(() => {
    process.env = {
      NODE_ENV: 'test',
      MCP_RESOURCE_URL: 'https://mcp.example/mcp',
      OAUTH_ISSUER: 'https://tenant.example/',
      API_SERVER_URL: 'https://api.example',
      MCP_ALLOWED_CLIENT_IDS: 'public-client',
      MCP_MAX_TOKEN_LIFETIME_SECONDS: '120',
      MCP_TRUSTED_INTERNAL_HOSTS: '127.0.0.1:8080,localhost:8080',
    };
  });
  afterEach(() => {
    process.env = originalEnv;
  });

  it('preserves shared lifetime and explicit internal host configuration', () => {
    expect(loadAdapterConfig()).toMatchObject({
      maxTokenLifetimeSeconds: 120,
      trustedInternalHosts: ['127.0.0.1:8080', 'localhost:8080'],
    });
  });
  it.each(['https://127.0.0.1', 'attacker.example', '127.0.0.1:8080/path', '*'])(
    'rejects unsafe internal host %s',
    (host) => {
      process.env.MCP_TRUSTED_INTERNAL_HOSTS = host;
      expect(() => loadAdapterConfig()).toThrow('MCP_TRUSTED_INTERNAL_HOSTS');
    },
  );
});
