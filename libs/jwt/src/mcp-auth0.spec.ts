import { generateKeyPairSync } from 'node:crypto';
import jwt = require('jsonwebtoken');
import { createMcpAuthVerifier, loadMcpAuthConfig, validateMcpIdentity } from './mcp-auth0';

const issuer = 'https://tenant.example/';
const audience = 'https://mcp.example/mcp';
const env = {
  OAUTH_ISSUER: issuer,
  MCP_RESOURCE_URL: audience,
  MCP_ALLOWED_CLIENT_IDS: 'approved-client,other-client',
};
const config = () => loadMcpAuthConfig(env);
const now = () => Math.floor(Date.now() / 1000);
const claims = (overrides: Record<string, unknown> = {}) => ({
  iss: issuer,
  aud: audience,
  sub: 'auth0|person',
  azp: 'approved-client',
  iat: now() - 1,
  exp: now() + 899,
  scope: 'mcp.tasks.read mcp.summary.read',
  ...overrides,
});

describe('Auth0 MCP shared resource contract', () => {
  it('maps the Auth0 subject/client without requiring custom grants or UUID subjects', () => {
    expect(validateMcpIdentity(claims(), config())).toEqual({
      subject: 'auth0|person',
      issuer,
      clientId: 'approved-client',
      expiresAt: now() + 899,
      scopes: new Set(['mcp.tasks.read', 'mcp.summary.read']),
    });
  });
  it.each([
    { aud: 'https://normal-api.example' },
    { aud: [audience, 'https://normal-api.example'] },
    { iss: 'https://attacker.example/' },
    { azp: 'unapproved' },
    { azp: undefined, client_id: 'approved-client' },
    { sub: 'approved-client@clients', gty: 'client-credentials' },
    { gty: 'client-credentials' },
    { act: { sub: 'adapter' } },
    { sub: '' },
    { exp: now() - 1 },
    { iat: now() + 30 },
    { exp: now() + 1800 },
    { iat: 1.1 },
    { exp: '12345' },
    { nbf: now() + 30 },
    { scope: 'mcp.tasks.read  mcp.tasks.write' },
    { scope: '' },
  ])('rejects an unauthorized or malformed identity: %j', (overrides) => {
    expect(() => validateMcpIdentity(claims(overrides), config())).toThrow('invalid_token');
  });
  it('accepts the explicitly selected RFC9068 client claim', () => {
    const cfg = loadMcpAuthConfig({ ...env, MCP_TOKEN_PROFILE: 'rfc9068' });
    expect(
      validateMcpIdentity(claims({ azp: undefined, client_id: 'approved-client', jti: 'unique' }), cfg).clientId,
    ).toBe('approved-client');
    expect(() => validateMcpIdentity(claims({ client_id: 'approved-client' }), cfg)).toThrow();
  });
  it('requires explicit issuer, resource and approved client configuration', () => {
    expect(config().jwksUrl).toBe(`${issuer}.well-known/jwks.json`);
    for (const key of Object.keys(env)) expect(() => loadMcpAuthConfig({ ...env, [key]: '' })).toThrow();
    expect(() => loadMcpAuthConfig({ ...env, MCP_TOKEN_PROFILE: 'guess' })).toThrow();
    expect(() => loadMcpAuthConfig({ ...env, OAUTH_JWKS_URL: 'https://attacker.example/keys' })).toThrow();
    expect(() => loadMcpAuthConfig({ ...env, MCP_RESOURCE_URL: 'https://mcp.example/other' })).toThrow();
    expect(() => loadMcpAuthConfig({ ...env, MCP_RESOURCE_URL: 'https://mcp.example/mcp?secret=x' })).toThrow();
    expect(() => loadMcpAuthConfig({ ...env, MCP_ALLOWED_CLIENT_IDS: 'approved-client,approved-client' })).toThrow();
  });
  it('allows only explicit local test hosts outside production', () => {
    const local = {
      ...env,
      OAUTH_ISSUER: 'http://auth-fixture:5040/',
      MCP_RESOURCE_URL: 'http://localhost:5039/mcp',
      MCP_ALLOW_LOCAL_HTTP: 'true',
    };
    expect(loadMcpAuthConfig(local).allowLocalHttp).toBe(true);
    expect(() => loadMcpAuthConfig({ ...local, NODE_ENV: 'production' })).toThrow();
    expect(() => loadMcpAuthConfig({ ...local, OAUTH_ISSUER: 'http://public.example/' })).toThrow();
  });
});

describe('Auth0 MCP cryptographic verification', () => {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const signed = (overrides: Record<string, unknown> = {}, typ = 'JWT') =>
    jwt.sign(claims(overrides), privateKey, { algorithm: 'RS256', keyid: 'current', header: { alg: 'RS256', typ } });
  // Only public key retrieval is replaced: signatures and claims use production verification.
  const resolveKey = jest.fn(async () => publicKey.export({ type: 'spki', format: 'pem' }).toString());
  beforeEach(() => resolveKey.mockClear());
  it('verifies a signed delegated Auth0 access token', async () => {
    await expect(createMcpAuthVerifier(config(), resolveKey).verify(signed())).resolves.toMatchObject({
      subject: 'auth0|person',
    });
  });
  it('rejects bad signatures, algorithms and token types', async () => {
    const verifier = createMcpAuthVerifier(config(), resolveKey);
    const wrong = generateKeyPairSync('rsa', { modulusLength: 2048 });
    await expect(
      verifier.verify(jwt.sign(claims(), wrong.privateKey, { algorithm: 'RS256', keyid: 'current' })),
    ).rejects.toThrow();
    await expect(verifier.verify(jwt.sign(claims(), 'secret', { algorithm: 'HS256' }))).rejects.toThrow();
    await expect(verifier.verify(signed({}, 'id+jwt'))).rejects.toThrow();
    await expect(verifier.verify('malformed')).rejects.toThrow();
  });
  it('requires at+jwt for RFC9068 and rejects ordinary ID token claims', async () => {
    const cfg = loadMcpAuthConfig({ ...env, MCP_TOKEN_PROFILE: 'rfc9068' });
    const verifier = createMcpAuthVerifier(cfg, resolveKey);
    const value = { azp: undefined, client_id: 'approved-client', jti: 'unique' };
    await expect(verifier.verify(signed(value, 'at+jwt'))).resolves.toMatchObject({ clientId: 'approved-client' });
    await expect(verifier.verify(signed(value))).rejects.toThrow();
    await expect(
      createMcpAuthVerifier(config(), resolveKey).verify(signed({ aud: 'approved-client', scope: undefined })),
    ).rejects.toThrow();
  });
  it('fails closed when public keys are unavailable', async () => {
    await expect(
      createMcpAuthVerifier(config(), async () => {
        throw new Error('JWKS offline');
      }).verify(signed()),
    ).rejects.toThrow();
  });
});
