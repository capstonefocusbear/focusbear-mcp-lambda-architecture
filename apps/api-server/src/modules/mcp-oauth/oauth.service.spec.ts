import { createExchangeProvider } from '../../../../mcp-server/src/adapter/exchange';
import { Test } from '@nestjs/testing';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ServiceUnavailableException, ValidationPipe } from '@nestjs/common';
import { createPublicKey, generateKeyPairSync, randomUUID } from 'crypto';
import * as jwt from 'jsonwebtoken';
import axios from 'axios';
import * as jwksClient from 'jwks-rsa';
import { readFileSync } from 'fs';
import { join } from 'path';
import { challenge, OAuthService } from './oauth.service';
import { OAuthStore } from './oauth.store';
import { OAuthController } from './oauth.controller';
import { registerOAuthFormParser } from './oauth.form';
import { loadOAuthConfig } from './oauth.config';

jest.mock('axios');
jest.mock('jwks-rsa', () => jest.fn());

const fixtures = JSON.parse(readFileSync(join(process.cwd(), 'contracts/mcp/v1/fixtures.json'), 'utf8'));
const keys = generateKeyPairSync('rsa', { modulusLength: 2048 });
const adapterKeys = generateKeyPairSync('rsa', { modulusLength: 2048 });
const auth0Keys = generateKeyPairSync('rsa', { modulusLength: 2048 });
const verifier = 'a'.repeat(43);
const userId = fixtures.tokens.mcp.sub;
const request = {
  client_id: fixtures.client_registration.client_id,
  redirect_uri: fixtures.client_registration.redirect_uris[0],
  resource: fixtures.profile.mcp_resource,
  scope: fixtures.client_registration.scope,
  state: 'random-client-state-0123456789',
  response_type: 'code',
  code_challenge_method: 'S256',
  code_challenge: challenge(verifier),
};

// Only persistence and the remote Auth0 boundary are mocked. Routes, parsing, consent,
// signing, JWT verification and single-use semantics run through production code.
class MemoryStore {
  handles = new Map<string, { kind: string; payload: any; expires: number }>();
  records = new Map<string, any>();
  userExists = true;
  assertions = new Set<string>();
  async reserveAssertion(client: string, jti: string, _exp: number) {
    const key = client + ':' + jti;
    if (this.assertions.has(key)) return false;
    this.assertions.add(key);
    return true;
  }
  async put(kind: string, payload: any, seconds: number) {
    const handle = randomUUID();
    this.handles.set(handle, { kind, payload, expires: Date.now() + seconds * 1000 });
    return handle;
  }
  async take(kind: string, handle: string) {
    const row = this.handles.get(handle);
    if (!row || row.kind !== kind) return undefined;
    this.handles.delete(handle);
    return row.expires > Date.now() ? row.payload : undefined;
  }
  async userForSubject(subject: string) {
    return this.userExists && subject === 'auth0|actual-user' ? userId : undefined;
  }
  async grants(user: string, client: string) {
    return [...this.records.values()].filter((g) => g.user_id === user && g.client_id === client && !g.revoked_at);
  }
  async transaction(work: any) {
    return work({
      query: async (sql: string, params: any[]) => {
        if (sql.startsWith('SELECT id FROM users'))
          return this.userExists && params[0] === userId ? [{ id: userId }] : [];
        if (sql.startsWith('INSERT INTO mcp_oauth_grants')) {
          const [id, user_id, client_id, agent_label, scopes] = params;
          const grant = { id, user_id, client_id, agent_label, scopes, revoked_at: null };
          this.records.set(id, grant);
          return [grant];
        }
        if (sql.startsWith('SELECT * FROM mcp_oauth_grants')) {
          const grant = this.records.get(params[0]);
          return grant && grant.user_id === params[1] && grant.client_id === params[2] && !grant.revoked_at
            ? [grant]
            : [];
        }
        if (sql.startsWith('WITH revoked AS')) {
          const grant = this.records.get(params[0]);
          if (!grant || grant.user_id !== params[1] || grant.revoked_at) return [];
          grant.revoked_at = new Date().toISOString();
          return [{ id: grant.id }];
        }
        throw new Error('Unexpected query');
      },
    });
  }
}

describe('MCP OAuth login through HTTP', () => {
  let app: NestFastifyApplication;
  let service: OAuthService;
  let store: MemoryStore;
  let savedEnv: NodeJS.ProcessEnv;

  beforeAll(async () => {
    savedEnv = { ...process.env };
    Object.assign(process.env, {
      MCP_OAUTH_ENABLED: 'true',
      OAUTH_ISSUER: fixtures.profile.issuer,
      MCP_RESOURCE_URL: fixtures.profile.mcp_resource,
      OAUTH_SIGNING_KID: 'generated-test-key',
      OAUTH_STATE_ENCRYPTION_KEY: 'ab'.repeat(32),
      OAUTH_SIGNING_PRIVATE_KEY: keys.privateKey.export({ format: 'pem', type: 'pkcs8' }).toString(),
      OAUTH_ADAPTER_PUBLIC_JWKS: JSON.stringify({
        keys: [{ ...adapterKeys.publicKey.export({ format: 'jwk' }), kid: 'adapter-key' }],
      }),
      AUTH0_DOMAIN: 'login.example',
      MCP_AUTH0_CLIENT_ID: 'browser-login-client',
      MCP_AUTH0_CLIENT_SECRET: 'test-secret',
      AUTH0_IDENTIFIER: 'https://focusbear.example/api',
      NODE_ENV: 'test',
    });
    delete process.env.OAUTH_PREVIOUS_PUBLIC_JWKS;
    const module = await Test.createTestingModule({
      controllers: [OAuthController],
      providers: [OAuthService, { provide: OAuthStore, useFactory: () => store }],
    }).compile();
    service = module.get(OAuthService);
    const adapter = new FastifyAdapter();
    registerOAuthFormParser(adapter);
    app = module.createNestApplication<NestFastifyApplication>(adapter);
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });
  beforeEach(() => {
    store = new MemoryStore();
    // Nest captures the initial injection; assign this instance to the service for test isolation.
    (service as any).store = store;
    jest.clearAllMocks();
    (jwksClient as unknown as jest.Mock).mockReturnValue({
      getSigningKey: async () => ({ getPublicKey: () => auth0Keys.publicKey }),
    });
    (axios.post as jest.Mock).mockImplementation(async (_url: string, body: string) => {
      // Callback already consumed the record, so nonce is set by the login helper.
      return {
        data: {
          id_token: jwt.sign({ sub: 'auth0|actual-user', nonce: activeNonce }, auth0Keys.privateKey, {
            algorithm: 'RS256',
            keyid: 'auth0-key',
            issuer: 'https://login.example/',
            audience: 'browser-login-client',
            expiresIn: 300,
          }),
        },
      };
    });
  });
  afterAll(async () => {
    await app.close();
    process.env = savedEnv;
  });
  let activeNonce: string;
  const inject = (options: any) => app.getHttpAdapter().getInstance().inject(options);
  const form = (url: string, body: any, cookie?: string) =>
    inject({
      method: 'POST',
      url,
      headers: { 'content-type': 'application/x-www-form-urlencoded', ...(cookie ? { cookie } : {}) },
      payload: new URLSearchParams(body).toString(),
    });
  async function login() {
    const start = await inject({ method: 'GET', url: '/oauth/authorize?' + new URLSearchParams(request) });
    expect(start.statusCode).toBe(302);
    const cookie = (start.headers['set-cookie'] as string).split(';')[0];
    const state = new URL(start.headers.location).searchParams.get('state');
    activeNonce = store.handles.get(state).payload.nonce;
    const callback = await inject({
      method: 'GET',
      url: `/oauth/callback?state=${state}&code=auth0-code`,
      headers: { cookie },
    });
    return { callback, cookie, state, handle: callback.body.match(/name="handle" value="([^"]+)"/)?.[1] };
  }
  async function authorize(grantId?: string) {
    const { handle, cookie, callback } = await login();
    expect(callback.statusCode).toBe(200);
    const consent = await form(
      '/oauth/consent',
      { handle, decision: 'approve', agent_label: 'Agent One', grant_id: grantId || '' },
      cookie,
    );
    expect(consent.statusCode).toBe(303);
    expect(consent.headers.location).not.toMatch(/token=/);
    return new URL(consent.headers.location).searchParams.get('code');
  }
  const exchange = (code: string, patch = {}) =>
    form('/oauth/token', {
      grant_type: 'authorization_code',
      code,
      client_id: request.client_id,
      redirect_uri: request.redirect_uri,
      resource: request.resource,
      code_verifier: verifier,
      ...patch,
    });

  it('publishes the exact local metadata and public JWKS', async () => {
    const metadata = await inject({ method: 'GET', url: '/.well-known/oauth-authorization-server' });
    expect(metadata.json()).toMatchObject({
      issuer: fixtures.profile.issuer,
      token_endpoint: fixtures.profile.token_endpoint,
      code_challenge_methods_supported: ['S256'],
      token_endpoint_auth_methods_supported: ['none', 'private_key_jwt'],
    });
    const jwks = (await inject({ method: 'GET', url: '/.well-known/jwks.json' })).json();
    expect(jwks.keys[0].d).toBeUndefined();
    expect(jwks.keys[0].kid).toBe('generated-test-key');
  });
  it.each(fixtures.login_rejections.filter((v: any) => v.redirect_uri || v.code_challenge_method))(
    'rejects fixture $id without redirect',
    async (vector: any) => {
      const patch = vector.redirect_uri
        ? { redirect_uri: vector.redirect_uri }
        : { code_challenge_method: vector.code_challenge_method };
      const response = await inject({
        method: 'GET',
        url: '/oauth/authorize?' + new URLSearchParams({ ...request, ...patch }),
      });
      expect(response.statusCode).toBe(400);
      expect(response.headers.location).toBeUndefined();
    },
  );
  it('issues RS256 MCP credentials for the mapped user only after explicit consent', async () => {
    const code = await authorize();
    const response = await exchange(code);
    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    const body = response.json();
    expect(body).toMatchObject({ token_type: 'Bearer', expires_in: 300, scope: request.scope });
    const decoded = jwt.decode(body.access_token, { complete: true });
    expect(decoded.header).toMatchObject(fixtures.jwt_header);
    const claims = jwt.verify(body.access_token, keys.publicKey, {
      algorithms: ['RS256'],
      issuer: requestIssuer(),
      audience: request.resource,
    }) as jwt.JwtPayload;
    expect(claims).toMatchObject({ sub: userId, client_id: request.client_id, scope: request.scope });
    expect(claims.exp - claims.iat).toBe(300);
    expect(store.records.has(claims.grant_id)).toBe(true);
    expect(() => jwt.verify(body.access_token, keys.publicKey, { clockTimestamp: claims.exp })).toThrow();
    expect(() => jwt.verify(body.access_token, auth0Keys.publicKey)).toThrow();
  });
  const requestIssuer = () => fixtures.profile.issuer;
  it.each(
    fixtures.login_rejections.filter(
      (v: any) => v.verifier_matches === false || v.code_already_used || v.code_age_seconds,
    ),
  )('executes fixture $id against code exchange', async (v: any) => {
    const code = await authorize();
    if (v.code_already_used) expect((await exchange(code)).statusCode).toBe(200);
    if (v.code_age_seconds) store.handles.get(code).payload.expiresAt -= v.code_age_seconds;
    const response = await exchange(code, v.verifier_matches === false ? { code_verifier: 'b'.repeat(43) } : {});
    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ error: 'invalid_grant' });
  });
  it('allows only one concurrent code exchange', async () => {
    const code = await authorize();
    const responses = await Promise.all([exchange(code), exchange(code)]);
    expect(responses.map((r) => r.statusCode).sort()).toEqual([200, 400]);
  });
  it('keeps an explicitly selected grant stable across token rotation', async () => {
    const first = (await exchange(await authorize())).json();
    const before = jwt.decode(first.access_token) as jwt.JwtPayload;
    const after = jwt.decode((await exchange(await authorize(before.grant_id))).json().access_token) as jwt.JwtPayload;
    expect(after.grant_id).toBe(before.grant_id);
    expect(after.jti).not.toBe(before.jti);
    expect(store.records.size).toBe(1);
  });
  it('creates separate grants for separate consents with the same agent label', async () => {
    await authorize();
    await authorize();
    expect(store.records.size).toBe(2);
  });
  it.each(['client_id', 'redirect_uri', 'resource'])('binds code to %s', async (field: string) => {
    const code = await authorize();
    const response = await exchange(code, { [field]: 'wrong' });
    expect(response.statusCode).toBe(field === 'client_id' ? 401 : 400);
  });
  it('denies anonymous token issuance, unsolicited callback, and consent', async () => {
    expect((await exchange('unknown')).statusCode).toBe(400);
    expect((await inject({ method: 'GET', url: '/oauth/callback?state=unknown&code=anything' })).statusCode).toBe(400);
    expect((await form('/oauth/consent', { handle: 'unknown', decision: 'approve' })).statusCode).toBe(400);
  });
  it('binds callback and consent to the browser and rejects replay', async () => {
    const { handle, cookie, state } = await login();
    expect(
      (
        await form(
          '/oauth/consent',
          { handle, decision: 'approve', agent_label: 'Agent' },
          'mcp_login=' + 'x'.repeat(43),
        )
      ).statusCode,
    ).toBe(400);
    expect(
      (await form('/oauth/consent', { handle, decision: 'approve', agent_label: 'Agent' }, cookie)).statusCode,
    ).toBe(400);
    expect(
      (await inject({ method: 'GET', url: `/oauth/callback?state=${state}&code=auth0-code`, headers: { cookie } }))
        .statusCode,
    ).toBe(400);
  });
  it('denial does not create a grant or issue a code', async () => {
    const { handle, cookie } = await login();
    const response = await form('/oauth/consent', { handle, decision: 'deny' }, cookie);
    expect(response.statusCode).toBe(303);
    expect(response.headers.location).toContain('error=access_denied');
    expect(store.records.size).toBe(0);
  });
  it('rejects wrong Auth0 issuer, audience, nonce, signature and expired ID tokens', async () => {
    for (const patch of [{ iss: 'https://evil.example/' }, { aud: 'wrong' }, { nonce: 'wrong' }, { exp: 1 }]) {
      (axios.post as jest.Mock).mockImplementationOnce(async () => ({
        data: {
          id_token: jwt.sign(
            {
              sub: 'auth0|actual-user',
              iss: 'https://login.example/',
              aud: 'browser-login-client',
              nonce: activeNonce,
              iat: Math.floor(Date.now() / 1000),
              exp: Math.floor(Date.now() / 1000) + 300,
              ...patch,
            },
            auth0Keys.privateKey,
            { algorithm: 'RS256', keyid: 'auth0-key' },
          ),
        },
      }));
      // biome-ignore lint/performance/noAwaitInLoops: each case binds a fresh nonce and one remote-response mock
      expect((await login()).callback.statusCode).toBe(401);
    }
    (axios.post as jest.Mock).mockResolvedValueOnce({
      data: {
        id_token: jwt.sign({ sub: 'auth0|actual-user' }, keys.privateKey, { algorithm: 'RS256', keyid: 'auth0-key' }),
      },
    });
    expect((await login()).callback.statusCode).toBe(401);
  });
  it('rejects unknown/deleted users and revoked grants before issuance', async () => {
    const code = await authorize();
    store.userExists = false;
    expect((await exchange(code)).json()).toEqual({ error: 'invalid_grant' });
    expect((await login()).callback.statusCode).toBe(403);
    store.userExists = true;
    const secondCode = await authorize();
    store.records.get(store.handles.get(secondCode).payload.grantId).revoked_at = 'revoked';
    expect((await exchange(secondCode)).json()).toEqual({ error: 'invalid_grant' });
  });
  it('rejects legacy scope aliases, identity overrides and duplicate form fields', async () => {
    for (const patch of [
      { scope: 'tasks:read' },
      { user_id: userId },
      { client_id: 'unregistered' },
      { response_type: 'token' },
    ]) {
      // biome-ignore lint/performance/noAwaitInLoops: keep request isolation for these input rejection cases
      const response = await inject({
        method: 'GET',
        url: '/oauth/authorize?' + new URLSearchParams({ ...request, ...patch }),
      });
      expect(response.statusCode).toBe(400);
    }
    const response = await inject({
      method: 'POST',
      url: '/oauth/token',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      payload: 'code=a&code=b',
    });
    expect(response.statusCode).toBe(400);
  });
  it('escapes agent labels in consent HTML', async () => {
    await authorize();
    [...store.records.values()][0].agent_label = '<script>alert(1)</script>';
    const { callback } = await login();
    expect(callback.body).toContain('&lt;script&gt;');
    expect(callback.body).not.toContain('<script>');
    expect(callback.headers['content-security-policy']).toContain("frame-ancestors 'none'");
  });
  it('revokes only an authenticated owner grant and stops subsequent code issuance', async () => {
    const code = await authorize();
    const grantId = store.handles.get(code).payload.grantId;
    const ownerToken = jwt.sign({ sub: 'auth0|actual-user' }, auth0Keys.privateKey, {
      algorithm: 'RS256',
      keyid: 'auth0-key',
      issuer: 'https://login.example/',
      audience: process.env.AUTH0_IDENTIFIER,
      expiresIn: 300,
    });
    expect((await inject({ method: 'DELETE', url: '/oauth/grants/' + grantId })).statusCode).toBe(401);
    expect(
      (
        await inject({
          method: 'DELETE',
          url: '/oauth/grants/' + grantId,
          headers: { authorization: 'Bearer ' + ownerToken },
        })
      ).statusCode,
    ).toBe(204);
    expect((await exchange(code)).statusCode).toBe(400);
  });
  it('keeps old public signing keys during rotation without publishing private material', () => {
    const old = createPublicKey(auth0Keys.privateKey).export({ format: 'jwk' });
    const rotated = loadOAuthConfig({
      ...process.env,
      OAUTH_PREVIOUS_PUBLIC_JWKS: JSON.stringify({ keys: [{ ...old, kid: 'old-key' }] }),
    });
    expect(rotated.jwks.keys).toHaveLength(2);
    expect(rotated.jwks.keys[1].d).toBeUndefined();
    expect(() =>
      loadOAuthConfig({
        ...process.env,
        OAUTH_PREVIOUS_PUBLIC_JWKS: JSON.stringify({ keys: [{ ...old, kid: 'old-key', d: 'secret' }] }),
      }),
    ).toThrow();
  });
  function assertion(patch = {}, signingKey = adapterKeys.privateKey) {
    const now = Math.floor(Date.now() / 1000);
    return jwt.sign(
      {
        iss: 'focusbear-mcp-adapter',
        sub: 'focusbear-mcp-adapter',
        aud: fixtures.profile.token_endpoint,
        iat: now,
        exp: now + 60,
        jti: randomUUID(),
        ...patch,
      },
      signingKey,
      { algorithm: 'RS256', keyid: 'adapter-key' },
    );
  }
  function subject(patch = {}, removed: string[] = []) {
    const now = Math.floor(Date.now() / 1000);
    const claims = {
      ...fixtures.tokens.mcp,
      iat: now + fixtures.tokens.mcp.iat - fixtures.now,
      exp: now + fixtures.tokens.mcp.exp - fixtures.now,
      ...patch,
    };
    for (const key of removed) delete claims[key];
    return jwt.sign(claims, keys.privateKey, {
      algorithm: 'RS256',
      keyid: 'generated-test-key',
      header: { alg: 'RS256', typ: 'at+jwt' },
    });
  }
  function delegate(patch = {}) {
    return form('/oauth/token', {
      ...fixtures.exchange.form,
      subject_token: subject(),
      client_assertion: assertion(),
      ...patch,
    });
  }
  function seedGrant() {
    const g = fixtures.context.grant;
    store.records.set(g.id, { ...g, agent_label: 'Agent', revoked_at: null });
  }
  it('exchanges an MCP token for a signed, narrowed API token with trusted actor', async () => {
    seedGrant();
    const response = await delegate();
    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    const body = response.json();
    expect(body).toMatchObject({ ...fixtures.exchange.response, access_token: expect.any(String) });
    const claims = jwt.verify(body.access_token, keys.publicKey, {
      algorithms: ['RS256'],
      issuer: fixtures.profile.issuer,
      audience: fixtures.profile.api_resource,
    }) as jwt.JwtPayload;
    expect(claims).toMatchObject({
      sub: userId,
      grant_id: fixtures.context.grant.id,
      client_id: 'focusbear-mcp-adapter',
      act: { sub: 'focusbear-mcp-adapter' },
      scope: 'mcp.tasks.read',
    });
    expect(claims.exp - claims.iat).toBe(60);
    expect((jwt.decode(body.access_token, { complete: true }) as any).header.typ).toBe('at+jwt');
    expect(() => jwt.verify(body.access_token, keys.publicKey, { audience: request.resource })).toThrow();
  });
  it('caps API expiry at the subject expiry and rotates API jti', async () => {
    seedGrant();
    const now = Math.floor(Date.now() / 1000);
    const token = subject({ exp: now + 20 });
    const a = (await delegate({ subject_token: token })).json();
    const b = (await delegate({ subject_token: token })).json();
    expect(a.expires_in).toBeLessThanOrEqual(20);
    expect((jwt.decode(a.access_token) as any).exp).toBe(now + 20);
    expect((jwt.decode(a.access_token) as any).jti).not.toBe((jwt.decode(b.access_token) as any).jti);
  });
  it.each(fixtures.exchange.reject)('rejects exchange fixture $id', async (v: any) => {
    seedGrant();
    const patch: any = {};
    if (v.subject_scope) patch.subject_token = subject({ scope: v.subject_scope });
    if (v.requested_scope) patch.scope = v.requested_scope;
    if (v.resource) patch.resource = v.resource;
    if (v.client_id) patch.client_id = v.client_id;
    if (v.assertion_jti_already_used) {
      patch.client_assertion = assertion();
      expect((await delegate(patch)).statusCode).toBe(200);
    }
    const response = await delegate(patch);
    expect(response.statusCode).toBe(v.status);
    expect(response.json()).toEqual({ error: v.error });
  });
  it.each(
    fixtures.authorization_cases.filter(
      (v: any) => (v.stage === 'mcp' || v.stage === 'exchange') && v.expected.http_status >= 400,
    ),
  )('rejects invalid subject fixture $id at exchange', async (v: any) => {
    seedGrant();
    const patch = { ...v.claims_patch };
    // Preserve the fixture's relative temporal values with a real current clock.
    for (const k of ['iat', 'exp', 'nbf']) if (k in patch) patch[k] += Math.floor(Date.now() / 1000) - fixtures.now;
    if (v.context_patch?.grant?.revoked) store.records.get(fixtures.context.grant.id).revoked_at = 'revoked';
    const response = await delegate({
      subject_token: subject(v.base_token === 'api' ? fixtures.tokens.api : patch, v.remove_claims),
    });
    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ error: 'invalid_grant' });
  });
  it.each([
    { aud: 'wrong' },
    { iss: 'wrong' },
    { sub: 'wrong' },
    { exp: 1 },
    { iat: Math.floor(Date.now() / 1000) + 10 },
    { exp: Math.floor(Date.now() / 1000) + 120 },
    { jti: '' },
    { aud: [fixtures.profile.token_endpoint] },
  ])('rejects invalid assertion %j', async (patch) => {
    seedGrant();
    expect((await delegate({ client_assertion: assertion(patch) })).json()).toEqual({ error: 'invalid_client' });
  });
  it('rejects unsigned, wrong-key and missing assertions, unknown users and grant-store outages', async () => {
    seedGrant();
    for (const client_assertion of ['', 'not-jwt', assertion({}, auth0Keys.privateKey)]) {
      // biome-ignore lint/performance/noAwaitInLoops: each request independently validates authentication
      expect((await delegate({ client_assertion })).statusCode).toBe(401);
    }
    store.userExists = false;
    expect((await delegate()).json()).toEqual({ error: 'invalid_grant' });
    store.userExists = true;
    jest
      .spyOn(store, 'transaction')
      .mockRejectedValueOnce(new ServiceUnavailableException({ error: 'temporarily_unavailable' }));
    expect((await delegate()).statusCode).toBe(503);
  });
  it('accepts only one concurrent request with the same service assertion', async () => {
    seedGrant();
    const client_assertion = assertion();
    const responses = await Promise.all([delegate({ client_assertion }), delegate({ client_assertion })]);
    expect(responses.map((r) => r.statusCode).sort()).toEqual([200, 401]);
  });

  it('preserves legacy exchange revocation semantics through real token and JWKS routes', async () => {
    const credential = (await exchange(await authorize())).json().access_token;
    const claims = jwt.decode(credential) as jwt.JwtPayload;
    const savedFetch = global.fetch;
    global.fetch = jest.fn(async (url: any, options: any = {}) => {
      const parsed = new URL(String(url));
      const response = await inject({
        method: options.method || 'GET',
        url: parsed.pathname,
        headers: options.headers,
        payload: options.body,
      });
      return new Response(response.body, { status: response.statusCode });
    }) as typeof fetch;
    try {
      const config = {
        issuer: fixtures.profile.issuer,
        resourceUrl: fixtures.profile.mcp_resource,
        jwksUrl: fixtures.profile.jwks_url,
        backendUrl: fixtures.profile.api_origin,
        allowedOrigins: [],
        allowLocalHttp: true,
      };
      const provider = createExchangeProvider(config, {
        MCP_ADAPTER_SIGNING_PRIVATE_KEY: adapterKeys.privateKey.export({ format: 'pem', type: 'pkcs8' }).toString(),
        MCP_ADAPTER_SIGNING_KID: 'adapter-key',
      });
      const context = {
        subject: claims.sub,
        grantId: claims.grant_id,
        clientId: claims.client_id,
        expiresAt: claims.exp,
        scopes: new Set<string>(claims.scope.split(' ')),
      };
      // Archived v1 exchange remains tested independently; the active v2 backend forwards the original JWT.
      const { token: sentToken } = await provider.getToken(credential, context);
      expect(sentToken).not.toBe(credential);
      expect(jwt.verify(sentToken, keys.publicKey, { audience: fixtures.profile.api_resource })).toMatchObject({
        sub: userId,
        grant_id: claims.grant_id,
        act: { sub: 'focusbear-mcp-adapter' },
      });
      store.records.get(claims.grant_id).revoked_at = 'revoked';
      await expect(provider.getToken(credential, context)).rejects.toThrow('backend_unauthorized');
    } finally {
      global.fetch = savedFetch;
    }
  });
});
