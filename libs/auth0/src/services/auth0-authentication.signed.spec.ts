import { generateKeyPairSync } from 'crypto';
import * as jwt from 'jsonwebtoken';
import { Auth0AuthenticationService } from './auth0-authentication.service';

const signingKey = jest.fn();
jest.mock('auth0');
jest.mock('jwks-rsa', () => jest.fn(() => ({ getSigningKey: signingKey })));

describe('Normal API signed Auth0 tokens', () => {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const service = new Auth0AuthenticationService({
    domain: 'tenant.auth0.com',
    clientId: 'client',
    clientSecret: 'secret',
    identifier: 'normal-api',
    connection: 'connection',
  });
  beforeEach(() => {
    signingKey.mockResolvedValue({ getPublicKey: () => publicKey.export({ type: 'spki', format: 'pem' }) });
  });
  const sign = (issuer: string) =>
    jwt.sign({ sub: 'auth0|user' }, privateKey, {
      algorithm: 'RS256',
      issuer,
      audience: 'normal-api',
      expiresIn: 60,
      keyid: 'key',
    });
  it('accepts correct issuer and algorithm', async () => {
    expect((await service.validateAccessToken(sign('https://tenant.auth0.com/')))[0]).toBe(true);
  });
  it('rejects a correctly signed token with wrong issuer', async () => {
    expect((await service.validateAccessToken(sign('https://other.auth0.com/')))[0]).toBe(false);
  });
  it('rejects HS256 even when audience and issuer match', async () => {
    const token = jwt.sign({ sub: 'auth0|user' }, 'attacker-secret', {
      algorithm: 'HS256',
      issuer: 'https://tenant.auth0.com/',
      audience: 'normal-api',
      expiresIn: 60,
    });
    expect((await service.validateAccessToken(token))[0]).toBe(false);
  });
});
