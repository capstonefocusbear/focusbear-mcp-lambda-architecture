# Focusware MCP Auth0 resource adapter (v2)

The adapter serves `/mcp` as a stateless MCP 2026-07-28 resource. Auth0 issues one access token for the canonical MCP resource audience; the adapter and dedicated API-server MCP routes independently verify that same token. The adapter has no database connection, OAuth signing key or token exchange in its active runtime. `adapter/exchange.ts` remains only for legacy v1 regression tests.

## Configuration and local run

Required settings are `MCP_RESOURCE_URL` (canonical HTTPS URL ending in `/mcp`), `OAUTH_ISSUER` (canonical Auth0 issuer with trailing slash), `MCP_ALLOWED_CLIENT_IDS` (comma-separated approved public client IDs), and `API_SERVER_URL` (backend origin). `OAUTH_JWKS_URL` defaults to the issuer's `/.well-known/jwks.json` and must use that issuer's origin. MCP and normal API audiences must differ.

The default `MCP_TOKEN_PROFILE=auth0` requires RS256 `typ=JWT` access tokens with `azp`. Explicit `rfc9068` mode requires `typ=at+jwt`, `client_id` and `jti`. Both profiles require a single exact audience, issuer, approved client, user subject, integer issue/expiry times, and space-separated scopes; client-credentials tokens and delegated `act` claims are rejected. `MCP_MAX_TOKEN_LIFETIME_SECONDS` defaults to 900 and accepts 60–3600.

For local fixtures only, `MCP_ALLOW_LOCAL_HTTP=true` permits the explicitly supported local hostnames; production refuses this switch. Optional settings are `MCP_PORT=5039`, `MCP_BIND_HOST=127.0.0.1`, and `MCP_ALLOWED_ORIGINS` (comma-separated browser origins). The default Host check uses the canonical resource host. A web adapter that replaces Host may use `MCP_TRUSTED_INTERNAL_HOSTS`, an explicit comma-separated allowlist of loopback host/port values such as `127.0.0.1:8080`; forwarded Host headers never establish trust. The deployment owner must ensure the edge accepts only the canonical public hostname.

Run `npm run mcp:start` or build with `npm run mcp:build`. Run adapter and shared JWT tests with `npm run mcp:test`; this uses isolated transpilation to keep runtime tests within the available heap. Run `npm run mcp:check` separately to typecheck both applications.

## Protocol contract

Public protected-resource metadata is available at both `/.well-known/oauth-protected-resource` and `/.well-known/oauth-protected-resource/mcp`. Challenges point to the path-specific document and advertise all three scopes. Missing or invalid bearer tokens fail closed. Origins and hosts are checked before dispatch; explicitly allowed browser origins receive CORS headers exposing `WWW-Authenticate` and `X-Request-Id`. Malformed request targets return safe 400 errors; the outer handler contains unexpected failures so Node HTTP listeners cannot leave rejected promises unhandled.

Each JSON-RPC POST requires `Accept: application/json, text/event-stream`, JSON content type, `MCP-Protocol-Version: 2026-07-28`, and `Mcp-Method` matching the body method. Body `params._meta` must contain `io.modelcontextprotocol/protocolVersion` and an object `io.modelcontextprotocol/clientCapabilities`. Named calls also require `Mcp-Name` matching the tool name (or the protocol's Base64 encoded-header form). Mismatches fail before backend access.

`server/discover`, `tools/list`, `tools/call`, and `ping` work without `initialize`, sessions, or persisted transport state. Successful responses include `resultType: complete` and server metadata. Unsupported versions return the supported version. Authenticated GET `/mcp` returns 405 because there is no standalone event stream.

The pinned SDK 1.27.1 supplies tool registration, schema validation and dispatch. Its older HTTP/session transport is deliberately replaced by `adapter/transport.ts`, which implements the 2026 request envelope. This is adapter compatibility, not a claim that SDK 1.27.1 natively implements 2026. Use a client supporting the 2026 contract for acceptance; older Inspector clients may send `initialize` and cannot validate it.

## Tools and backend routes

| Tool                                    | Required scope     | Backend route                      |
| --------------------------------------- | ------------------ | ---------------------------------- |
| `focusware_get_assigned_tasks_summary`  | `mcp.summary.read` | GET `/mcp/tasks/summary`           |
| `focusware_list_assigned_tasks`         | `mcp.tasks.read`   | GET `/mcp/tasks`                   |
| `focusware_get_assigned_task`           | `mcp.tasks.read`   | GET `/mcp/tasks/:id`               |
| `focusware_update_assigned_task_status` | `mcp.tasks.write`  | PATCH `/mcp/tasks/:id/status`      |
| `focusware_add_assigned_task_note`      | `mcp.tasks.write`  | POST `/mcp/tasks/:id/notes`        |
| `focusware_ensure_project_status`       | `mcp.tasks.write`  | POST `/mcp/tasks/project-statuses` |

Only these method/path pairs can receive the original bearer token; redirects are refused. The backend owns the durable agent connection, disabled state, user rate limit and assignment checks. The adapter never accepts user or agent identity overrides. Summary output contains numeric `total`, `not_started`, `in_progress`, `completed` and `overdue` counts. Other output is filtered to documented task, note, status and pagination fields.

Request bodies and backend responses are limited to 1 MiB. Request body reading has a one-second deadline, JWKS fetching a three-second timeout, backend reads at most one transport retry within an eight-second budget, and SDK dispatch a nine-second deadline. Writes are never retried. Telemetry contains only generated request ID, status, duration and allowlisted method/tool name; token, user, arguments, task data and upstream error messages are excluded. Backend failures return safe codes plus the generated request ID.

Real Auth0 configuration, external `aws-infra` deployment integration and live end-to-end acceptance require operator-owned environments. Local signed JWT/JWKS fixtures exercise the Auth0 claim profile without contacting or modifying a real tenant.
