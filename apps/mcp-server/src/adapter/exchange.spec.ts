import { createPublicKey, generateKeyPairSync, randomUUID } from 'crypto';
import * as jwt from 'jsonwebtoken';
import { createExchangeProvider } from './exchange';
import { LegacyExchangeConfig, LegacyExchangeIdentity } from './exchange';

const keys = generateKeyPairSync('rsa', { modulusLength: 2048 });
const config: LegacyExchangeConfig = {
  resourceUrl: 'https://mcp.example/mcp',
  issuer: 'https://issuer.example/',
  jwksUrl: 'https://issuer.example/jwks',
  backendUrl: 'https://api.example/',
  allowedOrigins: [],
  allowLocalHttp: false,
};
const now = () => Math.floor(Date.now() / 1000);
const context: LegacyExchangeIdentity = {
  subject: '11111111-1111-4111-8111-111111111111',
  grantId: '22222222-2222-4222-8222-222222222222',
  clientId: 'public-client',
  expiresAt: now() + 300,
  scopes: new Set(['mcp.tasks.read']),
};
const env = {
  MCP_ADAPTER_SIGNING_PRIVATE_KEY: keys.privateKey.export({ format: 'pem', type: 'pkcs8' }).toString(),
  MCP_ADAPTER_SIGNING_KID: 'adapter-key',
};
function apiToken(patch = {}, signingKey = keys.privateKey) {
  return jwt.sign(
    {
      iss: config.issuer,
      aud: new URL('/mcp/tasks', config.backendUrl).toString(),
      sub: context.subject,
      grant_id: context.grantId,
      client_id: 'focusbear-mcp-adapter',
      act: { sub: 'focusbear-mcp-adapter' },
      scope: 'mcp.tasks.read',
      iat: now(),
      exp: now() + 60,
      jti: randomUUID(),
      ...patch,
    },
    signingKey,
    { algorithm: 'RS256', keyid: 'server-key', header: { alg: 'RS256', typ: 'at+jwt' } },
  );
}

describe('confidential adapter exchange', () => {
  const savedFetch = global.fetch;
  afterEach(() => {
    global.fetch = savedFetch;
  });
  function network(patch = {}, status = 200) {
    const mock = jest.fn(async (url: any) => {
      if (String(url) === config.jwksUrl)
        return new Response(
          JSON.stringify({
            keys: [
              {
                ...keys.publicKey.export({ format: 'jwk' }),
                kid: 'server-key',
                alg: 'RS256',
                use: 'sig',
              },
            ],
          }),
        );
      return new Response(
        JSON.stringify({
          access_token: apiToken(patch),
          expires_in: 60,
          issued_token_type: 'urn:ietf:params:oauth:token-type:access_token',
          token_type: 'Bearer',
          scope: 'mcp.tasks.read',
        }),
        { status },
      );
    });
    global.fetch = mock as typeof fetch;
    return mock;
  }
  it('signs a fresh assertion, sends a fixed exchange request, and verifies the separate credential', async () => {
    const mock = network();
    const provider = createExchangeProvider(config, env);
    const result = await provider.getToken('mcp-token', context);
    expect(result.token).not.toBe('mcp-token');
    const [url, options] = mock.mock.calls[0] as any;
    expect(String(url)).toBe('https://issuer.example/oauth/token');
    expect(options.redirect).toBe('error');
    const form = new URLSearchParams(options.body);
    expect(form.get('resource')).toBe('https://api.example/mcp/tasks');
    expect(form.get('subject_token')).toBe('mcp-token');
    expect(form.get('scope')).toBe('mcp.tasks.read');
    const assertion = jwt.verify(form.get('client_assertion'), createPublicKey(keys.privateKey), {
      algorithms: ['RS256'],
      issuer: 'focusbear-mcp-adapter',
      subject: 'focusbear-mcp-adapter',
      audience: String(url),
    }) as jwt.JwtPayload;
    expect(assertion.exp - assertion.iat).toBe(60);
    await provider.getToken('mcp-token', context);
    const next = new URLSearchParams((mock.mock.calls[2] as any)[1].body);
    expect((jwt.decode(next.get('client_assertion')) as any).jti).not.toBe(assertion.jti);
  });
  it.each([
    { sub: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' },
    { grant_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' },
    { scope: 'mcp.tasks.write' },
    { aud: config.resourceUrl },
    { act: { sub: 'other' } },
    { act: undefined },
    { client_id: 'other' },
    { exp: now() + 120 },
  ])('rejects invalid exchanged claims %j', async (patch) => {
    network(patch);
    await expect(createExchangeProvider(config, env).getToken('mcp-token', context)).rejects.toThrow(
      'bad_backend_response',
    );
  });
  it('fails closed on exchange errors and transport failures without retrying', async () => {
    const mock = network({}, 401);
    await expect(createExchangeProvider(config, env).getToken('mcp-token', context)).rejects.toThrow(
      'backend_unauthorized',
    );
    expect(mock).toHaveBeenCalledTimes(1);
    mock.mockRejectedValue(new Error('secret request'));
    await expect(createExchangeProvider(config, env).getToken('mcp-token', context)).rejects.toThrow(
      'backend_transport_error',
    );
    expect(mock).toHaveBeenCalledTimes(2);
  });
  it('requires independent RSA adapter credentials', () => {
    expect(() => createExchangeProvider(config, {})).toThrow();
  });
  it('rejects an API token signed by an unregistered key', async () => {
    const mock = network();
    const other = generateKeyPairSync('rsa', { modulusLength: 2048 });
    mock.mockImplementationOnce(
      async () =>
        new Response(
          JSON.stringify({
            access_token: apiToken({}, other.privateKey),
            expires_in: 60,
            scope: 'mcp.tasks.read',
            token_type: 'Bearer',
            issued_token_type: 'urn:ietf:params:oauth:token-type:access_token',
          }),
        ),
    );
    await expect(createExchangeProvider(config, env).getToken('mcp-token', context)).rejects.toThrow(
      'bad_backend_response',
    );
  });
  it.each(['not-json', JSON.stringify({ keys: [] }), JSON.stringify({ keys: 'invalid' })])(
    'rejects malformed or missing JWKS keys %s',
    async (body) => {
      const mock = network();
      const original = mock.getMockImplementation();
      mock.mockImplementation(async (url: any) =>
        String(url) === config.jwksUrl ? new Response(body) : original(url),
      );
      await expect(createExchangeProvider(config, env).getToken('mcp-token', context)).rejects.toThrow(
        'bad_backend_response',
      );
    },
  );
  it.each(['not-json', '{}', 'x'.repeat(65537)])(
    'rejects malformed or oversized exchange response %#',
    async (body) => {
      network().mockImplementationOnce(async () => new Response(body));
      await expect(createExchangeProvider(config, env).getToken('mcp-token', context)).rejects.toThrow(
        'bad_backend_response',
      );
    },
  );
  it('selects the matching public key during signing-key overlap', async () => {
    const mock = network();
    const original = mock.getMockImplementation();
    const oldKey = generateKeyPairSync('rsa', { modulusLength: 2048 }).publicKey.export({ format: 'jwk' });
    mock.mockImplementation(async (url: any) =>
      String(url) === config.jwksUrl
        ? new Response(
            JSON.stringify({
              keys: [
                { ...oldKey, kid: 'old-key' },
                { ...keys.publicKey.export({ format: 'jwk' }), kid: 'server-key' },
              ],
            }),
          )
        : original(url),
    );
    expect((await createExchangeProvider(config, env).getToken('mcp-token', context)).token).toEqual(
      expect.any(String),
    );
  });
});
