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
      allowLocalHttp: true,
    };
  });
  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  function token(overrides: Record<string, unknown> = {}) {
    const claims = {
      sub: '11111111-1111-4111-8111-111111111111',
      grant_id: '22222222-2222-4222-8222-222222222222',
      client_id: 'public-client',
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
      header: { alg: 'RS256', typ: 'at+jwt' },
    });
  }

  it('accepts a signed token for this issuer and resource', async () => {
    const result = await createTokenVerifier(config).verify(token());
    expect(result.subject).toBe('11111111-1111-4111-8111-111111111111');
    expect(result.scopes.has('mcp.tasks.read')).toBe(true);
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
        sub: '11111111-1111-4111-8111-111111111111',
        grant_id: '22222222-2222-4222-8222-222222222222',
        client_id: 'public-client',
        jti: 'test-token',
        scope: 'mcp.tasks.read',
        iss: config.issuer,
        aud: config.resourceUrl,
        exp: Math.floor(Date.now() / 1000) + 300,
      },
      otherKeys.privateKey,
      { algorithm: 'RS256', keyid: 'test-key', header: { alg: 'RS256', typ: 'at+jwt' } },
    );
    await expect(verifier.verify(badSignature)).rejects.toThrow();
  });
  it.each([
    { aud: ['http://localhost:5039/mcp', 'https://api.example/mcp/tasks'] },
    { sub: 'auth0|user' },
    { grant_id: undefined },
    { client_id: undefined },
    { jti: undefined },
    { exp: undefined },
    { scope: 'tasks:read' },
    { scope: 'mcp.tasks.read  mcp.tasks.write' },
    { iat: Math.floor(Date.now() / 1000) + 10 },
    { exp: Math.floor(Date.now() / 1000) + 400 },
    { nbf: 1.5 },
    { act: { sub: 'focusbear-mcp-adapter' } },
  ])('rejects malformed MCP claims %j', async (patch) => {
    await expect(createTokenVerifier(config).verify(token(patch))).rejects.toThrow();
  });
});
