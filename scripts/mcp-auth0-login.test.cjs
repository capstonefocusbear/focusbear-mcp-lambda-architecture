const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createAuthorizationRequest, validateCallback } = require('./test-mcp-auth0-login.cjs');

test('direct Auth0 PKCE request uses only the canonical MCP resource and approved scopes', () => {
  const attempt = createAuthorizationRequest({
    issuer: 'https://tenant.example/',
    resource: 'https://mcp.example/mcp',
    clientId: 'approved',
    callback: 'http://127.0.0.1:6276/oauth/callback',
  });
  const url = new URL(attempt.url);
  assert.equal(url.origin, 'https://tenant.example');
  assert.equal(url.pathname, '/authorize');
  assert.equal(url.searchParams.get('resource'), 'https://mcp.example/mcp');
  assert.equal(url.searchParams.has('audience'), false);
  assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
  assert.equal(url.searchParams.get('scope'), 'mcp.tasks.read mcp.summary.read offline_access');
  assert.equal(url.searchParams.has('code_verifier'), false);
  assert.equal(url.searchParams.has('client_secret'), false);
  assert.ok(attempt.verifier.length >= 43);
  assert.ok(attempt.state.length >= 32);
});

test('callback is bound to state, exact path and issuer and cannot be reused', () => {
  const attempt = createAuthorizationRequest({
    issuer: 'https://tenant.example/',
    resource: 'https://mcp.example/mcp',
    clientId: 'approved',
    callback: 'http://127.0.0.1:6276/oauth/callback',
  });
  assert.throws(() => validateCallback('/oauth/callback?code=x&state=wrong', attempt), /Invalid callback/);
  assert.throws(() => validateCallback(`/wrong?code=x&state=${attempt.state}`, attempt), /Invalid callback/);
  assert.throws(
    () => validateCallback(`/oauth/callback?code=x&state=${attempt.state}&iss=https://evil.example/`, attempt),
    /Invalid callback/,
  );
  assert.equal(
    validateCallback(`/oauth/callback?code=one-time-code&state=${attempt.state}&iss=https://tenant.example/`, attempt),
    'one-time-code',
  );
  assert.throws(
    () => validateCallback(`/oauth/callback?code=x&state=${attempt.state}&iss=https://tenant.example/`, attempt),
    /Invalid callback/,
  );
});

test('only explicitly registered loopback callback and HTTPS Auth0 URLs are allowed', () => {
  const base = {
    issuer: 'https://tenant.example/',
    resource: 'https://mcp.example/mcp',
    clientId: 'approved',
    callback: 'http://127.0.0.1:6276/oauth/callback',
  };
  for (const changes of [
    { issuer: 'http://tenant.example/' },
    { callback: 'http://0.0.0.0:6276/oauth/callback' },
    { callback: 'http://127.0.0.1:6276/oauth/callback?x=1' },
    { resource: 'https://mcp.example/other' },
  ]) {
    assert.throws(() => createAuthorizationRequest({ ...base, ...changes }));
  }
});
