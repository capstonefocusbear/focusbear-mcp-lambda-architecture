# Auth0 MCP resource contract v2

Implements the approved Group 76 Practical Architectural Design v2.0 (21 October 2026). Replaces v1's custom backend authorization server and adapter token exchange. Auth0 owns authorization, consent, PKCE, access/refresh tokens and signing keys. Production tenant and infrastructure configuration still require Focus Bear operators and acceptance.

## Resource and identity

Use one canonical HTTPS resource URI ending exactly `/mcp`, configured as `MCP_RESOURCE_URL` and Auth0 API identifier. Lambda and dedicated backend MCP task routes are components of this resource. General API routes reject MCP-audience tokens. The adapter forwards the same bearer token only to its fixed configured backend routes. It never exchanges tokens, accepts caller URLs, adds a trusted user-ID header or needs a private signing key.

Both components independently verify RS256 signature, configured JWKS `kid`, exact issuer/audience, expiry, issuance time, optional `nbf`, delegated user and approved client. Default maximum lifetime is 900 seconds (configurable 60–3600). Audience is the MCP URI string or singleton array; additional audiences, including userinfo, are rejected. Configure Auth0 accordingly and verify actual issued tokens before launch.

Default `MCP_TOKEN_PROFILE=auth0` requires header `typ=JWT` and client claim `azp`. Explicit `rfc9068` requires `typ=at+jwt`, `client_id` and `jti`. ID-token audiences, machine subjects (`@clients`), client-credential grants and actor claims are rejected. `sub` is the external Auth0 subject; backend maps it to an existing local user through `users.auth0_id`. No custom `grant_id` is required. `MCP_ALLOWED_CLIENT_IDS` is an explicit comma-separated allowlist. Never infer identity from request parameters or display names.

## Authorization and agents

Scopes: `mcp.tasks.read`, `mcp.tasks.write`, `mcp.summary.read`. Other OIDC scopes confer no task permission; `offline_access` is never advertised as a resource scope. Task reads/updates are restricted to the authenticated user and assigned agent. Summaries aggregate only assigned tasks.

Backend resolves an agent by `(local user, verified issuer, verified client ID)` with a unique constraint and atomic first-use insertion. Disabled connections stay disabled on subsequent calls. Legacy identities and assignments are backfilled additively. Existing `assigned_mcp_token_id` remains supported alongside durable `assigned_mcp_agent_id`. No automatic merge by name. Connection management requires ordinary application authentication and ownership checks. Disconnect blocks local task access before external Auth0 revocation; reconnect is an explicit user action after administrative revocation completion.

Legacy opaque tokens retain independent validation. JWT-shaped credentials never fall back to legacy authentication. OAuth calls do not require an internal service key; legacy calls retain their legacy boundary.

## Transport and fixed routes

Public metadata: `/.well-known/oauth-protected-resource` and `/.well-known/oauth-protected-resource/mcp`. `/mcp` provides bearer challenges. Transport targets 2026-07-28 using a tested compatibility adapter over SDK tool definitions, with no initialization/session dependency. See the adapter README for metadata names, errors and compatibility tests. SDK version alone is not compliance evidence.

| Action                | Backend route                      | Scope              |
| --------------------- | ---------------------------------- | ------------------ |
| List assigned tasks   | `GET /mcp/tasks`                   | `mcp.tasks.read`   |
| Get assigned task     | `GET /mcp/tasks/:id`               | `mcp.tasks.read`   |
| Change task status    | `PATCH /mcp/tasks/:id/status`      | `mcp.tasks.write`  |
| Add note              | `POST /mcp/tasks/:id/notes`        | `mcp.tasks.write`  |
| Ensure project status | `POST /mcp/tasks/project-statuses` | `mcp.tasks.write`  |
| Assigned task summary | `GET /mcp/tasks/summary`           | `mcp.summary.read` |

No destructive tools. JSON results are allowlisted and failures sanitized. Backend limits use verified user identity in shared Redis. Work and response sizes are bounded; only idempotent reads may retry within the total deadline.

## Configuration and acceptance

See [.env.mcp.example](../../../.env.mcp.example), [operations](../../../docs/mcp-operations.md) and [adapter](../../../apps/mcp-server/README.md). Production requires HTTPS. Explicit non-production local mode permits fixed Docker/loopback fixture hosts. JWKS stays on issuer origin. Synthetic signing fixtures never become a production issuer.

Auth0 registration, exact callbacks, resource compatibility, consent, short access tokens, rotating refresh and administrative revocation need operator configuration. Acceptance requires real-client login/read/write/refresh/disconnect, audience isolation, concurrent agent creation and assignment continuity. LocalStack cannot prove production WAF/TLS/IAM/performance. Tests do not establish these external gates.

Sources: [Auth0 profiles](https://auth0.com/docs/secure/tokens/access-tokens/access-token-profiles), [resource compatibility](https://auth0.com/ai/docs/mcp/guides/resource-param-compatibility-profile), [MCP transport](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http).
