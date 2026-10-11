// Local manual test using the registered public-client profile; not an Inspector demonstration.
const http = require('node:http');
const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');

const issuer = 'http://127.0.0.1:5038/';
const redirectUri = 'http://127.0.0.1:6276/oauth/callback';
const resource = 'http://127.0.0.1:5039/mcp';
const verifier = crypto.randomBytes(32).toString('base64url');
const state = crypto.randomBytes(32).toString('base64url');
const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
let handled = false;

const server = http.createServer(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Referrer-Policy', 'no-referrer');
  const url = new URL(req.url, 'http://127.0.0.1:6276');
  if (req.method !== 'GET' || url.pathname !== '/oauth/callback') {
    res.writeHead(404).end('Not found');
    return;
  }
  if (url.searchParams.get('state') !== state || handled) {
    res.writeHead(400).end('Invalid or already-used callback state');
    return;
  }
  handled = true;
  if (url.searchParams.get('error')) {
    res.writeHead(400).end('Consent was denied. Run the helper again to retry.');
    console.log('Consent denied; no token issued.');
    server.close();
    return;
  }
  const code = url.searchParams.get('code');
  if (!code) {
    res.writeHead(400).end('Missing authorization code');
    server.close();
    return;
  }
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: 'focusbear-inspector-local',
    redirect_uri: redirectUri,
    resource,
    code,
    code_verifier: verifier,
  });
  try {
    const response = await fetch(`${issuer}oauth/token`, {
      method: 'POST',
      redirect: 'error',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(10000),
    });
    const result = await response.json();
    if (!response.ok || typeof result.access_token !== 'string') {
      process.exitCode = 1;
      console.log(`Token exchange failed (${response.status}): ${result.error || 'unexpected_response'}`);
      res.writeHead(400).end('Token exchange failed. Check the helper terminal.');
      return;
    }
    const jwksResponse = await fetch(`${issuer}.well-known/jwks.json`, {
      redirect: 'error',
      signal: AbortSignal.timeout(10000),
    });
    if (!jwksResponse.ok) throw new Error('JWKS request failed');
    const jwks = await jwksResponse.json();
    const decoded = jwt.decode(result.access_token, { complete: true });
    if (!decoded || decoded.header.alg !== 'RS256' || decoded.header.typ !== 'at+jwt')
      throw new Error('Unexpected JWT header');
    const key = jwks.keys.find((candidate) => candidate.kid === decoded.header.kid);
    if (!key) throw new Error('Signing key not published');
    const claims = jwt.verify(result.access_token, crypto.createPublicKey({ key, format: 'jwk' }), {
      algorithms: ['RS256'],
      issuer,
      audience: resource,
      clockTolerance: 0,
    });
    if (
      claims.aud !== resource ||
      claims.client_id !== 'focusbear-inspector-local' ||
      !Number.isInteger(claims.iat) ||
      !Number.isInteger(claims.exp) ||
      claims.exp - claims.iat !== 300 ||
      typeof claims.grant_id !== 'string' ||
      typeof claims.jti !== 'string'
    )
      throw new Error('Unexpected MCP claims');
    console.log('PASS: signed MCP access token verified against the published JWKS.');
    console.log(
      JSON.stringify(
        {
          user_id: claims.sub,
          grant_id: claims.grant_id,
          scope: claims.scope,
          expires_at: new Date(claims.exp * 1000).toISOString(),
        },
        null,
        2,
      ),
    );
    // Check that this same code cannot issue another token.
    const replay = await fetch(`${issuer}oauth/token`, {
      method: 'POST',
      redirect: 'error',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(10000),
    });
    const replayBody = await replay.json();
    if (replay.status !== 400 || replayBody.error !== 'invalid_grant')
      throw new Error('Authorization code replay was not rejected');
    console.log('PASS: authorization code replay rejected. No access token was printed or saved.');
    res
      .writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' })
      .end('OAuth login passed. Check your terminal for the verified user and grant.');
  } catch {
    console.error(
      'Test failed during exchange or token verification. Check API availability, configuration and published keys.',
    );
    res.writeHead(500).end('Test failed. Check the helper terminal.');
  } finally {
    server.close();
  }
});

server.on('error', (error) => {
  console.error(
    error.code === 'EADDRINUSE'
      ? 'Port 6276 is busy. Close any Inspector or previous callback helper, then retry.'
      : 'Could not start local callback server.',
  );
  process.exitCode = 1;
});
server.listen(6276, '127.0.0.1', () => {
  const url = new URL('oauth/authorize', issuer);
  url.search = new URLSearchParams({
    client_id: 'focusbear-inspector-local',
    redirect_uri: redirectUri,
    response_type: 'code',
    resource,
    scope: 'mcp.tasks.read mcp.tasks.write',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  }).toString();
  console.log('Open this URL in your browser, sign in with your personal-tenant test user, and approve consent:');
  console.log(url.toString());
  console.log('Leave this terminal running. Press Ctrl+C to cancel.');
});
