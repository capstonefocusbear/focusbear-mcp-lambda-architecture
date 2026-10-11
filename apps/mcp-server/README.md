# Focusware MCP OAuth adapter

This application serves a stateless MCP Streamable HTTP endpoint at `/mcp` and OAuth protected-resource metadata at `/.well-known/oauth-protected-resource`. It exposes five task tools and verifies user access tokens against the configured API server issuer and JWKS. The local runner uses the same HTTP handler that the AWS owner can mount in Lambda.

## Local run

Set `MCP_RESOURCE_URL`, `OAUTH_ISSUER`, `OAUTH_JWKS_URL`, and `API_SERVER_URL`. Use HTTPS in deployed environments. For a loopback test issuer and backend, set `MCP_ALLOW_LOCAL_HTTP=true` and use loopback URLs. Optional settings are `MCP_PORT` (default `5039`), `MCP_BIND_HOST` (default `127.0.0.1`), and comma-separated `MCP_ALLOWED_ORIGINS`. Then run `npm run mcp:start`, `npm run mcp:build`, and `npm run mcp:test`.

For protocol checks, configure MCP Inspector against the local `/mcp` URL. The adapter returns a Bearer challenge with the resource metadata URL and supports JSON responses for `initialize`, `tools/list`, and `tools/call`. `GET /mcp` returns 405 after authentication because this adapter has no standalone server event stream.

## API server contract

The shared target is [OAuth and task authorization contract v1](../../contracts/mcp/v1/README.md)
with [accepted/rejected fixtures](../../contracts/mcp/v1/fixtures.json), prepared for
issue #4. It selects API-server issuance after Auth0 login, separate MCP/API
audiences, authenticated token exchange, and durable `grant_id` assignments.
The contract is a proposal awaiting API/MCP owner review. Task 39 enforces the
login, token-exchange, and adapter JWT claims; API task rules remain pending. The fixture's local registration has not been
applied to a running authorization server. Login and delegation are implemented in Task 39; API task authorization and
assignment migration remain tracked in #7.

The adapter now exchanges the MCP access token at the API server’s `/oauth/token`
using RFC 8693 and `private_key_jwt`. Configure `MCP_ADAPTER_SIGNING_KID` and
`MCP_ADAPTER_SIGNING_PRIVATE_KEY` in the adapter process and register its public
JWK under `OAUTH_ADAPTER_PUBLIC_JWKS` in the API. Apply both OAuth migrations.
The startup fails closed without adapter signing credentials. The provider returns
a **separate**, verified API-audience token; it never forwards the client’s MCP
resource token to task routes. Production task access still requires #7’s API
JWT authorization and grant assignment migration. This follows the MCP [access token privilege restriction](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization#access-token-privilege-restriction), which forbids passing the client's token through to an upstream API.

The API server provides issuer metadata and JWKS. MCP RS256 access tokens require
`typ=at+jwt`, a registered `kid`, exact `iss`, a single string `aud` equal to the
MCP resource URL, UUID `sub` and `grant_id`, `client_id`, integer `iat`/`exp`, fresh
`jti`, and explicit space-delimited scopes. Multi-audience and malformed claims
are rejected. The adapter requires `mcp.tasks.read` for task reads and `mcp.tasks.write` for updates, notes, and project status creation. The separate backend token must identify the user and a durable agent or grant so the API server can authorize assignments independently. Backend routes are `GET /mcp/tasks`, `GET /mcp/tasks/:id`, `PATCH /mcp/tasks/:id/status`, `POST /mcp/tasks/:id/notes`, and `POST /mcp/tasks/project-statuses`.

The current API server routes still use opaque tokens, `tasks:read` / `tasks:write`, an internal service key, and `assigned_mcp_token_id`. Task 39 implements OAuth login, PKCE, consent, static client registration and token
exchange. Task #7 still owns the task-route OAuth guards and grant assignment
migration; AWS deployment and live Inspector validation remain separate. Full
task authorization requires those integrations.
