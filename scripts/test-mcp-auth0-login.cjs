'use strict';
// Manual non-production acceptance client. Credentials stay in memory and are never printed.
const { randomBytes, createHash, timingSafeEqual } = require('node:crypto');
const { createServer } = require('node:http');

function createAuthorizationRequest({ issuer, resource, clientId, callback }) {
  const auth = new URL(issuer);
  const target = new URL(resource);
  const redirect = new URL(callback);
  if (
    auth.protocol !== 'https:' ||
    auth.pathname !== '/' ||
    auth.search ||
    auth.hash ||
    auth.username ||
    auth.password ||
    target.protocol !== 'https:' ||
    target.pathname !== '/mcp' ||
    target.search ||
    target.hash ||
    target.username ||
    target.password ||
    redirect.protocol !== 'http:' ||
    redirect.hostname !== '127.0.0.1' ||
    !redirect.port ||
    redirect.pathname !== '/oauth/callback' ||
    redirect.search ||
    redirect.hash ||
    redirect.username ||
    redirect.password ||
    !/^[A-Za-z0-9_-]{1,256}$/.test(clientId || '')
  )
    throw new Error('Invalid Auth0 acceptance client configuration');
  const verifier = randomBytes(32).toString('base64url');
  const state = randomBytes(32).toString('base64url');
  const url = new URL('authorize', auth);
  url.search = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: callback,
    resource,
    scope: 'mcp.tasks.read mcp.summary.read offline_access',
    state,
    code_challenge: createHash('sha256').update(verifier).digest('base64url'),
    code_challenge_method: 'S256',
    prompt: 'consent',
  });
  return {
    url: url.toString(),
    issuer: auth.toString(),
    resource,
    clientId,
    callback,
    verifier,
    state,
    consumed: false,
  };
}

function validateCallback(path, attempt) {
  const callback = new URL(attempt.callback);
  const value = new URL(path, callback);
  const state = value.searchParams.get('state') || '';
  const expected = Buffer.from(attempt.state);
  const received = Buffer.from(state);
  if (
    attempt.consumed ||
    value.origin !== callback.origin ||
    value.pathname !== callback.pathname ||
    received.length !== expected.length ||
    !timingSafeEqual(received, expected) ||
    value.searchParams.getAll('state').length !== 1 ||
    value.searchParams.getAll('code').length !== 1 ||
    value.searchParams.getAll('iss').length !== 1 ||
    value.searchParams.get('iss') !== attempt.issuer ||
    !value.searchParams.get('code') ||
    value.searchParams.has('error')
  )
    throw new Error('Invalid callback');
  attempt.consumed = true;
  return value.searchParams.get('code');
}

async function jsonRequest(url, init) {
  const response = await fetch(url, { ...init, redirect: 'error', signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`Acceptance HTTP request failed (${response.status})`);
  const body = await response.text();
  if (body.length > 1_048_576) throw new Error('Acceptance response too large');
  return JSON.parse(body);
}

async function run() {
  if (process.env.NODE_ENV === 'production') throw new Error('Use only an approved non-production Auth0 application');
  const attempt = createAuthorizationRequest({
    issuer: process.env.OAUTH_ISSUER,
    resource: process.env.MCP_RESOURCE_URL,
    clientId: process.env.MCP_TEST_CLIENT_ID,
    callback: process.env.MCP_TEST_CALLBACK || 'http://127.0.0.1:6276/oauth/callback',
  });
  require('ts-node').register({ transpileOnly: true });
  const { createMcpAuthVerifier, loadMcpAuthConfig } = require('../libs/jwt/src/mcp-auth0');
  const verifier = createMcpAuthVerifier(loadMcpAuthConfig());
  let server;
  const code = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      server.close();
      reject(new Error('Browser login timed out'));
    }, 600000);
    server = createServer((req, res) => {
      if (req.method !== 'GET') {
        res.writeHead(405);
        res.end();
        return;
      }
      try {
        if (req.headers.host !== new URL(attempt.callback).host) throw new Error('Invalid callback host');
        const code = validateCallback(req.url, attempt);
        clearTimeout(timer);
        res.writeHead(200, {
          'content-type': 'text/plain',
          'cache-control': 'no-store',
          'referrer-policy': 'no-referrer',
        });
        res.end('Login received. Return to the terminal.');
        server.close();
        resolve(code);
      } catch {
        res.writeHead(400, { 'cache-control': 'no-store' });
        res.end('Invalid callback');
      }
    });
    server.once('error', () => {
      clearTimeout(timer);
      reject(new Error('Cannot bind the registered callback port'));
    });
    server.listen(Number(new URL(attempt.callback).port), '127.0.0.1', () => {
      process.stdout.write(`Open this Auth0 authorization URL in your browser:\n${attempt.url}\n`);
    });
  });
  const tokenUrl = new URL('oauth/token', attempt.issuer);
  const exchange = (form) =>
    jsonRequest(tokenUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(form),
    });
  let tokens = await exchange({
    grant_type: 'authorization_code',
    client_id: attempt.clientId,
    code,
    redirect_uri: attempt.callback,
    code_verifier: attempt.verifier,
    resource: attempt.resource,
  });
  const firstIdentity = await verifier.verify(tokens.access_token);
  const tool = async (name, token) => {
    const value = await jsonRequest(attempt.resource, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
        'mcp-protocol-version': '2026-07-28',
        'mcp-method': 'tools/call',
        'mcp-name': name,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: randomBytes(8).toString('hex'),
        method: 'tools/call',
        params: {
          name,
          arguments: {},
          _meta: {
            'io.modelcontextprotocol/protocolVersion': '2026-07-28',
            'io.modelcontextprotocol/clientCapabilities': {},
          },
        },
      }),
    });
    if (value.error || value.result?.isError) throw new Error('MCP tool acceptance failed');
  };
  await tool('focusware_list_assigned_tasks', tokens.access_token);
  await tool('focusware_get_assigned_tasks_summary', tokens.access_token);
  if (!tokens.refresh_token)
    throw new Error('No refresh token: enable offline access and rotating refresh for this app');
  const refreshed = await exchange({
    grant_type: 'refresh_token',
    client_id: attempt.clientId,
    refresh_token: tokens.refresh_token,
    resource: attempt.resource,
  });
  const secondIdentity = await verifier.verify(refreshed.access_token);
  if (
    !refreshed.refresh_token ||
    refreshed.refresh_token === tokens.refresh_token ||
    firstIdentity.subject !== secondIdentity.subject ||
    firstIdentity.clientId !== secondIdentity.clientId
  ) {
    throw new Error('Refresh rotation or identity continuity failed');
  }
  tokens = refreshed;
  await tool('focusware_list_assigned_tasks', tokens.access_token);
  // Revoke the test client's refresh grant on successful completion. Disconnect and
  // write acceptance are separate explicit tests in the operator runbook.
  const revoke = await fetch(new URL('oauth/revoke', attempt.issuer), {
    method: 'POST',
    redirect: 'error',
    signal: AbortSignal.timeout(10000),
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: attempt.clientId,
      token: tokens.refresh_token,
      token_type_hint: 'refresh_token',
    }),
  });
  if (!revoke.ok) throw new Error(`Test refresh revocation failed (${revoke.status})`);
  const revoked = await fetch(tokenUrl, {
    method: 'POST',
    redirect: 'error',
    signal: AbortSignal.timeout(10000),
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: attempt.clientId,
      refresh_token: tokens.refresh_token,
      resource: attempt.resource,
    }),
  });
  if (revoked.status !== 400) throw new Error('Revoked refresh credential was not rejected as expected');
  process.stdout.write(
    'PASS: direct Auth0 PKCE, signed token, task read, summary, rotating refresh, refreshed task read and revoked refresh rejection. No credentials or task content saved.\n',
  );
}

module.exports = { createAuthorizationRequest, validateCallback };
if (require.main === module)
  run().catch(() => {
    process.stderr.write(
      'Auth0 acceptance failed; check approved app configuration, backend readiness and registered callback. No credential details logged.\n',
    );
    process.exitCode = 1;
  });
