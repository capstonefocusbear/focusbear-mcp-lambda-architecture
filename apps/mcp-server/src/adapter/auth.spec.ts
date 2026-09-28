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
    return jwt.sign(
      {
        sub: 'user-1',
        scope: 'mcp.tasks.read',
        iss: config.issuer,
        aud: config.resourceUrl,
        exp: Math.floor(Date.now() / 1000) + 300,
        ...overrides,
      },
      keys.privateKey,
      { algorithm: 'RS256', keyid: 'test-key' },
    );
  }

  it('accepts a signed token for this issuer and resource', async () => {
    const result = await createTokenVerifier(config).verify(token());
    expect(result.subject).toBe('user-1');
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
        sub: 'user-1',
        scope: 'mcp.tasks.read',
        iss: config.issuer,
        aud: config.resourceUrl,
        exp: Math.floor(Date.now() / 1000) + 300,
      },
      otherKeys.privateKey,
      { algorithm: 'RS256', keyid: 'test-key' },
    );
    await expect(verifier.verify(badSignature)).rejects.toThrow();
  });
});
