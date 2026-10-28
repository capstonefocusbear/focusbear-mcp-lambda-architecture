import { createServer } from 'node:http';
import { generateKeyPairSync } from 'node:crypto';
import jwt = require('jsonwebtoken');
import { AddressInfo } from 'node:net';
import { createTokenVerifier } from './auth';
import { AdapterConfig } from './config';

describe('OAuth JWT verifier', () => {
  const keys = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const jwk = keys.publicKey.export({ format: 'jwk' }) as Record<string, unknown>;
  let server: ReturnType<typeof createServer>;
  let config: AdapterConfig;

  beforeAll(async () => {
    server = createServer((_req, res) => {
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ keys: [{ ...jwk, kid: 'test-key', alg: 'RS256', use: 'sig' }] }));
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = (server.address() as AddressInfo).port;
    config = {
      resourceUrl: 'http://localhost:5039/mcp',
      issuer: 'https://issuer.example',
      jwksUrl: `http://127.0.0.1:${port}/jwks`,
      backendUrl: 'https://api.example',
      allowedOrigins: [],
      allowedClients: ['public-client'],
      tokenProfile: 'auth0',
      allowLocalHttp: true,
    };
  });
  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  function token(overrides: Record<string, unknown> = {}) {
    const claims = {
      sub: 'auth0|user',

      azp: 'public-client',
      jti: 'test-token',
      scope: 'mcp.tasks.read',
      iss: config.issuer,
      aud: config.resourceUrl,
      exp: Math.floor(Date.now() / 1000) + 300,
      ...overrides,
    };
    for (const key of Object.keys(claims)) if (claims[key] === undefined) delete claims[key];
    return jwt.sign(claims, keys.privateKey, {
      algorithm: 'RS256',
      keyid: 'test-key',
      header: { alg: 'RS256', typ: 'JWT' },
    });
  }

  it('accepts a signed token for this issuer and resource', async () => {
    const result = await createTokenVerifier(config).verify(token());
    expect(result.subject).toBe('auth0|user');
    expect(result.scopes.has('mcp.tasks.read')).toBe(true);
  });

  it('honors the configured maximum token lifetime', async () => {
    await expect(createTokenVerifier({ ...config, maxTokenLifetimeSeconds: 60 }).verify(token())).rejects.toThrow();
    await expect(
      createTokenVerifier({ ...config, maxTokenLifetimeSeconds: 600 }).verify(token()),
    ).resolves.toBeDefined();
  });

  it('rejects a wrong audience, expired token, and malformed token', async () => {
    const verifier = createTokenVerifier(config);
    await expect(verifier.verify(token({ aud: 'https://other.example' }))).rejects.toThrow();
    await expect(verifier.verify(token({ iss: 'https://other-issuer.example' }))).rejects.toThrow();
    await expect(verifier.verify(token({ exp: Math.floor(Date.now() / 1000) - 10 }))).rejects.toThrow();
    await expect(verifier.verify(token({ nbf: Math.floor(Date.now() / 1000) + 300 }))).rejects.toThrow();
    await expect(verifier.verify('not-a-jwt')).rejects.toThrow();
    const otherKeys = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const badSignature = jwt.sign(
      {
        sub: 'auth0|user',

        azp: 'public-client',
        jti: 'test-token',
        scope: 'mcp.tasks.read',
        iss: config.issuer,
        aud: config.resourceUrl,
        exp: Math.floor(Date.now() / 1000) + 300,
      },
      otherKeys.privateKey,
      { algorithm: 'RS256', keyid: 'test-key', header: { alg: 'RS256', typ: 'JWT' } },
    );
    await expect(verifier.verify(badSignature)).rejects.toThrow();
  });
  it.each([
    { aud: ['http://localhost:5039/mcp', 'https://api.example/mcp/tasks'] },
    { sub: 'client@clients' },
    { azp: undefined },
    { azp: 'unapproved' },
    { exp: undefined },
    { scope: 'mcp.tasks.read  mcp.tasks.write' },
    { iat: Math.floor(Date.now() / 1000) + 10 },
    { exp: Math.floor(Date.now() / 1000) + 3600 },
    { nbf: 1.5 },
    { act: { sub: 'focusbear-mcp-adapter' } },
  ])('rejects malformed MCP claims %j', async (patch) => {
    await expect(createTokenVerifier(config).verify(token(patch))).rejects.toThrow();
  });
});
