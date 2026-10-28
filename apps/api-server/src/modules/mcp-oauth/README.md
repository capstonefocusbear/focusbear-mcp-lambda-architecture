> **Archived v1 implementation.** The main API no longer mounts these custom OAuth endpoints. Auth0 owns OAuth under [contract v2](../../../../../contracts/mcp/v2/README.md). Do not use the signing-key or token-exchange setup below for the active MCP resource. Retained source/tests are historical regression coverage.

# Focus Bear MCP OAuth endpoints and token exchange (Task 39)

Implements the proposed [v1 contract](../../../../../contracts/mcp/v1/README.md).
OAuth is disabled by default. The retired `POST /mcp/auth/tokens` route requires
Auth0 authentication and returns 410; anonymous issuance, the fixed test user,
token deep links, and the test redirect are removed. Existing legacy list/revoke
operations remain authenticated for migration.

## Configuration

Apply `1801526400000-mcpOAuthAuthorization.ts` and
`1801526400001-mcpOAuthAssertionReplay.ts` to the API database before enabling
OAuth. It adds consent grants and expiring, encrypted single-use handles; it does
not add task assignments or migrate legacy credentials. Expired handles are
removed on subsequent issuance. All API instances must share the database,
state encryption key, issuer, registration, and signing configuration.

Set these environment variables using your secret manager:

- `MCP_OAUTH_ENABLED=true`
- `OAUTH_ISSUER=http://127.0.0.1:5038/` (exact trailing slash)
- `MCP_RESOURCE_URL=http://127.0.0.1:5039/mcp`
- `OAUTH_SIGNING_PRIVATE_KEY`: PEM RSA private key, at least 2048 bits; literal `\n` escapes are supported
- `OAUTH_SIGNING_KID`: unique signing key ID
- `OAUTH_STATE_ENCRYPTION_KEY`: independent random 32-byte key encoded as 64 hex characters
- `AUTH0_DOMAIN`: existing Auth0 tenant hostname
- `MCP_AUTH0_CLIENT_ID`, `MCP_AUTH0_CLIENT_SECRET`: dedicated Auth0 Regular Web Application credentials
- `AUTH0_IDENTIFIER`: existing Auth0 API audience for authenticated grant management

Register exactly `http://127.0.0.1:5038/oauth/callback` as the Auth0 application's
allowed callback. Enable the authorization-code grant and RS256 ID tokens.
Auth0 is used only for login. The verified Auth0 `sub` must match exactly one
existing `users.auth0_id`; the resulting `users.id` is the MCP token subject.

The local profile registers `focusbear-inspector-local`, public client auth method
`none`, with exactly `http://127.0.0.1:6276/oauth/callback`. No dynamic registration
or client metadata URL support is advertised. Configure that existing client ID
explicitly in the Inspector. Production requires HTTPS, a complete deployed
profile, and explicit `MCP_OAUTH_CLIENT_ID` / `MCP_OAUTH_REDIRECT_URI` registration;
the local registration is never implicitly enabled in production.

## Flow and lifecycle

1. Open `/oauth/authorize` with `client_id`, exact `redirect_uri`,
   `response_type=code`, MCP `resource`, explicit scopes, random `state` (at least
   16 characters), `code_challenge`, and `code_challenge_method=S256`.
2. Complete Auth0 login in the browser. A nonce, independent Auth0 PKCE verifier,
   single-use state, and HttpOnly SameSite cookie bind the login to that browser.
3. Approve the displayed task and shared-project permissions. Enter an agent
   label for a new grant, or explicitly select an eligible active grant to retain
   its assignment identity. Denial issues no credential. Consent is single use,
   expires after 10 minutes, and is bound to the login cookie.
4. Receive only `code` and the original `state` at the registered callback.
5. POST an `application/x-www-form-urlencoded` body to `/oauth/token` with
   `grant_type=authorization_code`, `client_id`, `code`, `redirect_uri`, MCP
   `resource`, and the original `code_verifier`. Duplicate/unknown fields and
   identity overrides are rejected. Codes expire after 60 seconds and are consumed
   atomically, including unsuccessful verification attempts. No refresh tokens.

Successful responses contain a 300-second RS256 JWT with `typ=at+jwt`, `kid`, exact
issuer and single MCP audience, mapped UUID subject, `client_id`, durable `grant_id`,
explicit scopes, integer issuance/expiry, and fresh `jti`. Both user and grant are
rechecked and locked through signing. Token and browser responses use `no-store`;
request logs omit query strings. State payloads are AES-256-GCM encrypted so SQL
query logging cannot expose PKCE verifiers. Raw tokens are never persisted.

`GET /oauth/grants` and `DELETE /oauth/grants/:id` require an Auth0 API bearer token,
verify its signature/issuer/audience, and map its subject to the current owner.
Revocation is terminal. Reusing a revoked grant is rejected and subsequent consent
creates a new ID. Grant outages fail closed with a sanitized 503 response.

Publish old public keys in `OAUTH_PREVIOUS_PUBLIC_JWKS` (`{"keys":[...]}`) during
signing-key rotation. Keep overlap for at least the 600-second adapter key cache
plus issued token lifetime. Do not rotate the independent state encryption key
while login/consent sessions are active; drain their 10-minute lifetime first.
Never place keys, tokens, cookies, or OAuth request bodies in external proxy logs.

## Confidential adapter token exchange

`POST /oauth/token` also accepts the RFC 8693 token-exchange grant. The exact form
is in `contracts/mcp/v1/fixtures.json`. The public browser client cannot exchange
MCP access tokens. The service client is fixed to `focusbear-mcp-adapter` and uses
`private_key_jwt`: an RS256 assertion with registered `kid`, `iss` and `sub` equal
to that client ID, exact token-endpoint `aud`, integer `iat`/`exp`, lifetime at
most 60 seconds, and a fresh `jti`. Assertions are reserved atomically in
`mcp_oauth_assertions`; concurrent reuse is rejected across API instances.

Register the adapter's public RSA keys (at least 2048 bits) in
`OAUTH_ADAPTER_PUBLIC_JWKS={"keys":[...]}`. Each public key needs a distinct `kid`.
No adapter key means exchange fails closed, while browser login remains available.
Set `OAUTH_API_RESOURCE_URL` to `${OAUTH_ISSUER}mcp/tasks` (this is also the default).
The exchange verifies the MCP token using the current or retained issuer keys,
checks its single MCP audience and required claims, then locks and rechecks its
user and active originating-client grant through signing. Requested scopes must
be a subset of both the MCP token and grant. Omitted scope preserves the subject
scope; omitted requested token type defaults to access token.

The resulting RS256 `at+jwt` token has only the API audience, preserves the user
and durable `grant_id`, identifies `focusbear-mcp-adapter` in `client_id` and
`act.sub`, and expires at the earlier of subject expiry and 60 seconds. Responses
include `issued_token_type`, `token_type`, `expires_in`, `scope`, and `access_token`.
Invalid assertions return `invalid_client` (401), invalid subject/grant returns
`invalid_grant` (400), escalation returns `invalid_scope` (400), and store outages
return sanitized 503 responses. Credentials and assertions are never logged or
persisted in plaintext. Retain old adapter public keys for in-flight assertions
when rotating keys. Apply both migrations before enabling exchange.

The adapter uses `MCP_ADAPTER_SIGNING_PRIVATE_KEY` (PEM, literal `\\n` supported)
and `MCP_ADAPTER_SIGNING_KID` to authenticate each exchange. Keep that private key
in the adapter's secret store. The API receives only its public JWK. The adapter
verifies the returned JWT against issuer JWKS and checks audience, actor, subject,
grant, exact requested scopes and expiry before calling a fixed task route. It
performs a fresh exchange for each call and rejects redirects; it never forwards
the MCP token to the task API.

## Validation and remaining integration

Run `npm test -- --runInBand apps/api-server/src/modules/mcp-oauth
apps/api-server/src/modules/external-mcp_fffff` and the API TypeScript check.
The HTTP tests consume all v1 login rejection fixtures through production routes,
use generated RSA keys, and cover actual signed Auth0 ID-token verification,
consent, expiry, concurrent replay, grant rotation/revocation, and public-key overlap.
Persistence and the remote Auth0 responses are mocked in these tests; they do not
establish a live Auth0 application, PostgreSQL migration execution, or an Inspector
demonstration. Those require configured infrastructure.

Task 39 implements the login endpoints, confidential adapter exchange, and full
adapter JWT context. The round-trip test drives the real token/JWKS routes and
production adapter provider, then proves committed revocation stops backend calls.
#7 reuses `mcp_oauth_grants` for current task authorization, adds assignment/migration
schema, and tests database races. #8 verifies the configured Inspector and deployed
profile. Enabling this login flow alone does not enable OAuth task access.

Implementation references: [Auth0 ID-token validation](https://auth0.com/docs/secure/tokens/id-tokens/validate-id-tokens),
[PKCE S256](https://www.rfc-editor.org/rfc/rfc7636.html), and
[jsonwebtoken signing and verification](https://github.com/auth0/node-jsonwebtoken).

## Personal Auth0 tenant and local browser test

A personal tenant works for #5. Create a Regular Web Application using Client
Secret (Post), Authorization Code and RS256. Register the API's exact
`http://127.0.0.1:5038/oauth/callback` in its Allowed Callback URLs and enable your
test user's database connection for the application. Set `AUTH0_DOMAIN` to your
personal tenant hostname (without scheme/slash), and put this application's
credentials in `MCP_AUTH0_CLIENT_ID` / `MCP_AUTH0_CLIENT_SECRET`. Keep existing
personal-tenant backend management credentials separate. You do not need an
Auth0 Action or a new Auth0 API to test this login flow; grant-management endpoints
additionally need an Auth0 API bearer token for `AUTH0_IDENTIFIER`.

Create an Auth0 test user and copy its full User ID, e.g. `auth0|...`.
After applying the repository migrations to a local development database, create
a local identity row using that exact subject. Run this only on your local test
DB, replacing the placeholder before execution:

```sql
INSERT INTO users (id, auth0_id, created_at, updated_at)
VALUES (gen_random_uuid(), 'auth0|YOUR_PERSONAL_TEST_USER_ID', now(), now())
ON CONFLICT (auth0_id) DO NOTHING;

SELECT id, auth0_id FROM users
WHERE auth0_id = 'auth0|YOUR_PERSONAL_TEST_USER_ID';
```

This creates the identity needed for OAuth tests only; it does not provision the
full account/device/billing state of a normal Focus Bear signup. No production
user or fixed prototype user is required.

With the API running on port 5038, start the local manual client:

```bash
node scripts/test-mcp-oauth-login.cjs
```

Open the printed authorization URL in your browser. Sign in using the test user's
email/password, approve consent, and enter a name for a new grant. The helper
listens at the already-registered `http://127.0.0.1:6276/oauth/callback`, exchanges
the returned code immediately using a random S256 verifier, verifies the signed
MCP token against the published JWKS, and confirms that code replay returns
`invalid_grant`. It prints only user/grant/scope/expiry and never prints or saves
the bearer credential. Run the helper again for each new attempt. Close any
Inspector or other listener using port 6276 first. This manual client uses the
approved registration as a test harness; it is not the #8 Inspector demonstration.

The helper's syntax has been checked. Live completion still depends on your
personal Auth0 settings and running local API/database.

For a focused local test, run the OAuth module against your normally migrated local
API database without starting the rest of the backend:

```bash
npx ts-node -r tsconfig-paths/register scripts/test-mcp-oauth-server.ts
```

This runner requires the local issuer, a non-production environment and a loopback
PostgreSQL host. It binds only to `127.0.0.1:5038`, uses the production OAuth
controller/service/store, and exposes no task API. PostgreSQL is its only local
service dependency; Redis and the other backend integration credentials are not
required for this runner. Apply `npm run migration:up` and create the local test
user before starting the browser helper. The full API's ordinary startup path
remains `npm run start:dev` when testing all backend modules.
