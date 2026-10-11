import {
  ACCESS_TOKEN_TYPE,
  JWT_ASSERTION_TYPE,
  MCP_ADAPTER_CLIENT,
  TOKEN_EXCHANGE_GRANT,
  validateMcpClaims,
  McpAccessClaims,
} from '@app/jwt/mcp-claims';
import { HttpException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { createHash, createPublicKey, randomUUID } from 'crypto';
import axios from 'axios';
import * as jwt from 'jsonwebtoken';
import * as jwksClient from 'jwks-rsa';
import { MCP_SCOPES, loadOAuthConfig, OAuthConfig } from './oauth.config';
import { digest, Grant, OAuthStore, opaque } from './oauth.store';

export function oauthError(error: string, status = 400): never {
  throw new HttpException({ error }, status);
}
export function fields(input: unknown, allowed: string[]): Record<string, string> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) oauthError('invalid_request');
  for (const [key, value] of Object.entries(input)) {
    if (!allowed.includes(key) || typeof value !== 'string' || value.length > 4096) oauthError('invalid_request');
  }
  return input as Record<string, string>;
}
export const challenge = (verifier: string) => createHash('sha256').update(verifier).digest('base64url');
export interface Authorization {
  client_id: string;
  redirect_uri: string;
  resource: string;
  scope: string;
  state: string;
  code_challenge: string;
}
interface Login {
  request: Authorization;
  browser: string;
  nonce: string;
  verifier: string;
}
interface Consent {
  request: Authorization;
  browser: string;
  userId: string;
}
interface Code {
  request: Authorization;
  userId: string;
  grantId: string;
  expiresAt: number;
}

@Injectable()
export class OAuthService {
  readonly configuration = loadOAuthConfig();
  constructor(private readonly store: OAuthStore) {}

  config(): OAuthConfig {
    if (!this.configuration) throw new ServiceUnavailableException({ error: 'temporarily_unavailable' });
    return this.configuration;
  }

  metadata() {
    const config = this.config();
    return {
      issuer: config.issuer,
      authorization_endpoint: `${config.issuer}oauth/authorize`,
      token_endpoint: `${config.issuer}oauth/token`,
      jwks_uri: `${config.issuer}.well-known/jwks.json`,
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code', TOKEN_EXCHANGE_GRANT],
      token_endpoint_auth_methods_supported: ['none', 'private_key_jwt'],
      token_endpoint_auth_signing_alg_values_supported: ['RS256'],
      code_challenge_methods_supported: ['S256'],
      scopes_supported: MCP_SCOPES,
    };
  }

  validateAuthorization(input: unknown): Authorization {
    const q = fields(input, [
      'client_id',
      'redirect_uri',
      'response_type',
      'resource',
      'scope',
      'state',
      'code_challenge',
      'code_challenge_method',
    ]);
    const config = this.config();
    // Never redirect errors for an untrusted registration or URI.
    if (q.client_id !== config.client.client_id || q.redirect_uri !== config.client.redirect_uri)
      oauthError('invalid_request');
    if (
      q.response_type !== 'code' ||
      q.code_challenge_method !== 'S256' ||
      !/^[A-Za-z0-9_-]{43}$/.test(q.code_challenge || '') ||
      !q.state ||
      q.state.length < 16
    )
      oauthError('invalid_request');
    if (q.resource !== config.resource) oauthError('invalid_target');
    this.scopes(q.scope);
    return {
      client_id: q.client_id,
      redirect_uri: q.redirect_uri,
      resource: q.resource,
      scope: q.scope,
      state: q.state,
      code_challenge: q.code_challenge,
    };
  }

  scopes(scope: string): string[] {
    if (typeof scope !== 'string' || !scope || scope.trim() !== scope || scope.includes('  '))
      oauthError('invalid_scope');
    const scopes = scope.split(' ');
    if (scopes.some((s) => !MCP_SCOPES.includes(s)) || new Set(scopes).size !== scopes.length)
      oauthError('invalid_scope');
    return scopes;
  }

  async authorize(input: unknown) {
    const request = this.validateAuthorization(input);
    const config = this.config();
    const browser = opaque();
    const nonce = opaque();
    const verifier = opaque();
    const state = await this.store.put('login', { request, browser: digest(browser), nonce, verifier }, 600);
    const url = new URL('authorize', config.auth0Issuer);
    url.search = new URLSearchParams({
      client_id: config.auth0ClientId,
      response_type: 'code',
      scope: 'openid',
      redirect_uri: `${config.issuer}oauth/callback`,
      state,
      nonce,
      code_challenge: challenge(verifier),
      code_challenge_method: 'S256',
    }).toString();
    return { url: url.toString(), browser };
  }

  async callback(input: unknown, browser: string) {
    const q = fields(input, ['state', 'code', 'error', 'error_description']);
    if (!q.state || !browser) oauthError('invalid_request');
    const login = await this.store.take<Login>('login', q.state);
    if (!login || login.browser !== digest(browser)) oauthError('invalid_request');
    if (q.error || !q.code) oauthError('access_denied');
    const subject = await this.auth0Subject(q.code, login);
    const userId = await this.store.userForSubject(subject);
    if (!userId) oauthError('access_denied', 403);
    const handle = await this.store.put('consent', { request: login.request, browser: login.browser, userId }, 600);
    const grants = await this.store.grants(userId, login.request.client_id);
    return { handle, request: login.request, grants };
  }

  async auth0Subject(code: string, login: Login): Promise<string> {
    const config = this.config();
    try {
      const response = await axios.post(
        `${config.auth0Issuer}oauth/token`,
        new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: `${config.issuer}oauth/callback`,
          client_id: config.auth0ClientId,
          client_secret: config.auth0ClientSecret,
          code_verifier: login.verifier,
        }).toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          maxRedirects: 0,
          timeout: 5000,
          maxContentLength: 65536,
        },
      );
      return await this.verifyAuth0(response.data?.id_token, config.auth0ClientId, login.nonce);
    } catch {
      // Axios errors include the secret-bearing request. Never log/rethrow them.
      oauthError('access_denied', 401);
    }
  }

  private async verifyAuth0(token: string, audience: string, nonce?: string): Promise<string> {
    const config = this.config();
    try {
      if (typeof token !== 'string') oauthError('access_denied');
      const decoded = jwt.decode(token, { complete: true });
      if (!decoded || typeof decoded === 'string' || decoded.header.alg !== 'RS256' || !decoded.header.kid)
        oauthError('access_denied');
      const client = jwksClient({ jwksUri: `${config.auth0Issuer}.well-known/jwks.json`, timeout: 3000 });
      const key = await client.getSigningKey(decoded.header.kid);
      const claims = jwt.verify(token, key.getPublicKey(), {
        algorithms: ['RS256'],
        issuer: config.auth0Issuer,
        audience: audience,
        clockTolerance: 0,
      }) as jwt.JwtPayload;
      if (
        (nonce !== undefined && claims.nonce !== nonce) ||
        typeof claims.sub !== 'string' ||
        !claims.sub ||
        !Number.isInteger(claims.exp) ||
        !Number.isInteger(claims.iat) ||
        claims.iat > Math.floor(Date.now() / 1000) ||
        (Array.isArray(claims.aud) && claims.azp !== audience)
      )
        oauthError('access_denied');
      return claims.sub;
    } catch {
      oauthError('access_denied', 401);
    }
  }

  async owner(authorization: string): Promise<string> {
    if (!/^Bearer [^ ]+$/.test(authorization || '') || !process.env.AUTH0_IDENTIFIER) oauthError('access_denied', 401);
    const subject = await this.verifyAuth0(authorization.slice(7), process.env.AUTH0_IDENTIFIER);
    const userId = await this.store.userForSubject(subject);
    if (!userId) oauthError('access_denied', 401);
    return userId;
  }

  async listGrants(authorization: string) {
    return this.store.grants(await this.owner(authorization), this.config().client.client_id);
  }

  async revokeGrant(authorization: string, grantId: string): Promise<void> {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(grantId))
      oauthError('invalid_request');
    const userId = await this.owner(authorization);
    await this.store.transaction(async (manager) => {
      const rows = await manager.query(
        'WITH revoked AS (UPDATE mcp_oauth_grants SET revoked_at = now() WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL RETURNING id) SELECT id FROM revoked',
        [grantId, userId],
      );
      if (!rows.length) oauthError('not_found', 404);
    });
  }

  async consent(input: unknown, browser: string): Promise<string> {
    const form = fields(input, ['handle', 'decision', 'agent_label', 'grant_id']);
    if (!form.handle || !browser) oauthError('invalid_request');
    const consent = await this.store.take<Consent>('consent', form.handle);
    if (!consent || consent.browser !== digest(browser)) oauthError('invalid_request');
    const redirect = new URL(consent.request.redirect_uri);
    redirect.searchParams.set('state', consent.request.state);
    if (form.decision === 'deny') {
      redirect.searchParams.set('error', 'access_denied');
      return redirect.toString();
    }
    if (form.decision !== 'approve') oauthError('invalid_request');
    const scopes = this.scopes(consent.request.scope);
    const grant = await this.store.transaction(async (manager) => {
      const users = await manager.query('SELECT id FROM users WHERE id = $1 FOR SHARE', [consent.userId]);
      if (!users.length) oauthError('access_denied', 403);
      if (form.grant_id) {
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(form.grant_id))
          oauthError('invalid_request');
        const rows: Grant[] = await manager.query(
          'SELECT * FROM mcp_oauth_grants WHERE id = $1 AND user_id = $2 AND client_id = $3 AND revoked_at IS NULL FOR SHARE',
          [form.grant_id, consent.userId, consent.request.client_id],
        );
        if (!rows.length || scopes.some((s) => !rows[0].scopes.includes(s))) oauthError('invalid_grant');
        return rows[0];
      }
      const label = form.agent_label?.trim();
      if (!label || label.length > 100) oauthError('invalid_request');
      const id = randomUUID();
      const rows: Grant[] = await manager.query(
        'INSERT INTO mcp_oauth_grants (id, user_id, client_id, agent_label, scopes) VALUES ($1,$2,$3,$4,$5) RETURNING *',
        [id, consent.userId, consent.request.client_id, label, scopes],
      );
      return rows[0];
    });
    const code = await this.store.put(
      'code',
      {
        request: consent.request,
        userId: consent.userId,
        grantId: grant.id,
        expiresAt: Math.floor(Date.now() / 1000) + 60,
      },
      60,
    );
    redirect.searchParams.set('code', code);
    return redirect.toString();
  }

  private async authenticateAdapter(form: Record<string, string>): Promise<void> {
    const config = this.config();
    let claims: jwt.JwtPayload;
    try {
      if (form.client_id !== MCP_ADAPTER_CLIENT || form.client_assertion_type !== JWT_ASSERTION_TYPE)
        throw new Error('invalid_client');
      const decoded = jwt.decode(form.client_assertion, { complete: true });
      if (!decoded || decoded.header.alg !== 'RS256' || typeof decoded.header.kid !== 'string')
        throw new Error('invalid_client');
      const key = config.adapterJwks.keys.find((k) => k.kid === decoded.header.kid);
      if (!key) throw new Error('invalid_client');
      claims = jwt.verify(form.client_assertion, createPublicKey({ key, format: 'jwk' }), {
        algorithms: ['RS256'],
        issuer: MCP_ADAPTER_CLIENT,
        subject: MCP_ADAPTER_CLIENT,
        audience: `${config.issuer}oauth/token`,
        clockTolerance: 0,
      }) as jwt.JwtPayload;
      const now = Math.floor(Date.now() / 1000);
      if (
        claims.aud !== `${config.issuer}oauth/token` ||
        !Number.isInteger(claims.iat) ||
        !Number.isInteger(claims.exp) ||
        claims.iat > now ||
        claims.exp <= now ||
        claims.exp <= claims.iat ||
        claims.exp - claims.iat > 60 ||
        (claims.nbf !== undefined && (!Number.isInteger(claims.nbf) || claims.nbf > now)) ||
        typeof claims.jti !== 'string' ||
        !claims.jti ||
        claims.jti.length > 256
      )
        throw new Error('invalid_client');
    } catch {
      oauthError('invalid_client', 401);
    }
    // Keep persistence failures outside the catch so outages retain sanitized 503 responses.
    if (!(await this.store.reserveAssertion(MCP_ADAPTER_CLIENT, claims.jti, claims.exp)))
      oauthError('invalid_client', 401);
  }

  private subjectClaims(token: string): McpAccessClaims {
    const config = this.config();
    try {
      const decoded = jwt.decode(token, { complete: true });
      if (
        !decoded ||
        decoded.header.alg !== 'RS256' ||
        decoded.header.typ !== 'at+jwt' ||
        typeof decoded.header.kid !== 'string'
      )
        throw new Error('invalid_token');
      const key = config.jwks.keys.find((k) => k.kid === decoded.header.kid);
      if (!key) throw new Error('invalid_token');
      const claims = jwt.verify(token, createPublicKey({ key, format: 'jwk' }), {
        algorithms: ['RS256'],
        issuer: config.issuer,
        audience: config.resource,
        clockTolerance: 0,
      }) as jwt.JwtPayload;
      if (claims.act !== undefined) throw new Error('invalid_token');
      return validateMcpClaims(claims, config.resource, 300);
    } catch {
      oauthError('invalid_grant');
    }
  }

  private async delegate(input: unknown) {
    const form = fields(input, [
      'grant_type',
      'subject_token',
      'subject_token_type',
      'requested_token_type',
      'resource',
      'scope',
      'client_id',
      'client_assertion_type',
      'client_assertion',
    ]);
    const config = this.config();
    await this.authenticateAdapter(form);
    if (form.resource !== config.apiResource) oauthError('invalid_target');
    if (
      form.subject_token_type !== ACCESS_TOKEN_TYPE ||
      (form.requested_token_type !== undefined && form.requested_token_type !== ACCESS_TOKEN_TYPE)
    )
      oauthError('invalid_request');
    const subject = this.subjectClaims(form.subject_token);
    const scope = form.scope === undefined ? subject.scope : form.scope;
    const scopes = this.scopes(scope);
    if (scopes.some((s) => !subject.scope.split(' ').includes(s))) oauthError('invalid_scope');
    return this.store.transaction(async (manager) => {
      const users = await manager.query('SELECT id FROM users WHERE id = $1 FOR SHARE', [subject.sub]);
      const grants: Grant[] = await manager.query(
        'SELECT * FROM mcp_oauth_grants WHERE id = $1 AND user_id = $2 AND client_id = $3 AND revoked_at IS NULL FOR SHARE',
        [subject.grant_id, subject.sub, subject.client_id],
      );
      if (!users.length || !grants.length) oauthError('invalid_grant');
      if (scopes.some((s) => !grants[0].scopes.includes(s))) oauthError('invalid_scope');
      const now = Math.floor(Date.now() / 1000);
      const exp = Math.min(now + 60, subject.exp);
      if (exp <= now) oauthError('invalid_grant');
      return {
        access_token: jwt.sign(
          {
            iss: config.issuer,
            aud: config.apiResource,
            sub: subject.sub,
            client_id: MCP_ADAPTER_CLIENT,
            grant_id: subject.grant_id,
            scope,
            iat: now,
            exp,
            jti: randomUUID(),
            act: { sub: MCP_ADAPTER_CLIENT },
          },
          config.privateKey,
          { algorithm: 'RS256', keyid: config.kid, header: { alg: 'RS256', typ: 'at+jwt' } },
        ),
        issued_token_type: ACCESS_TOKEN_TYPE,
        token_type: 'Bearer',
        expires_in: exp - now,
        scope,
      };
    });
  }

  async token(input: unknown) {
    if (input && typeof input === 'object' && (input as Record<string, unknown>).grant_type === TOKEN_EXCHANGE_GRANT)
      return this.delegate(input);
    const form = fields(input, ['grant_type', 'code', 'client_id', 'redirect_uri', 'resource', 'code_verifier']);
    const config = this.config();
    if (form.grant_type !== 'authorization_code') oauthError('unsupported_grant_type');
    if (form.client_id !== config.client.client_id) oauthError('invalid_client', 401);
    if (!form.code || !/^[A-Za-z0-9._~-]{43,128}$/.test(form.code_verifier || '')) oauthError('invalid_grant');
    const code = await this.store.take<Code>('code', form.code);
    if (
      !code ||
      code.expiresAt <= Math.floor(Date.now() / 1000) ||
      code.request.client_id !== form.client_id ||
      code.request.redirect_uri !== form.redirect_uri ||
      code.request.resource !== form.resource ||
      challenge(form.code_verifier) !== code.request.code_challenge
    )
      oauthError('invalid_grant');
    // Lock the current user/grant through signing so revocation cannot race issuance.
    return this.store.transaction(async (manager) => {
      const users = await manager.query('SELECT id FROM users WHERE id = $1 FOR SHARE', [code.userId]);
      const grants: Grant[] = await manager.query(
        'SELECT * FROM mcp_oauth_grants WHERE id = $1 AND user_id = $2 AND client_id = $3 AND revoked_at IS NULL FOR SHARE',
        [code.grantId, code.userId, form.client_id],
      );
      const scopes = this.scopes(code.request.scope);
      if (!users.length || !grants.length || scopes.some((s) => !grants[0].scopes.includes(s)))
        oauthError('invalid_grant');
      const now = Math.floor(Date.now() / 1000);
      const token = jwt.sign(
        {
          iss: config.issuer,
          aud: config.resource,
          sub: code.userId,
          client_id: form.client_id,
          grant_id: code.grantId,
          scope: scopes.join(' '),
          iat: now,
          exp: now + 300,
          jti: randomUUID(),
        },
        config.privateKey,
        { algorithm: 'RS256', keyid: config.kid, header: { alg: 'RS256', typ: 'at+jwt' } },
      );
      return { access_token: token, token_type: 'Bearer', expires_in: 300, scope: scopes.join(' ') };
    });
  }
}
