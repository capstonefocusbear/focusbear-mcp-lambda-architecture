# Focusware MCP OAuth adapter

This application serves a stateless MCP Streamable HTTP endpoint at `/mcp` and OAuth protected-resource metadata at `/.well-known/oauth-protected-resource`. It exposes five task tools and verifies user access tokens against the configured API server issuer and JWKS. The local runner uses the same HTTP handler that the AWS owner can mount in Lambda.

## Local run

Set `MCP_RESOURCE_URL`, `OAUTH_ISSUER`, `OAUTH_JWKS_URL`, and `API_SERVER_URL`. Use HTTPS in deployed environments. For a loopback test issuer and backend, set `MCP_ALLOW_LOCAL_HTTP=true` and use loopback URLs. Optional settings are `MCP_PORT` (default `5039`), `MCP_BIND_HOST` (default `127.0.0.1`), and comma-separated `MCP_ALLOWED_ORIGINS`. Then run `npm run mcp:start`, `npm run mcp:build`, and `npm run mcp:test`.

For protocol checks, configure MCP Inspector against the local `/mcp` URL. The adapter returns a Bearer challenge with the resource metadata URL and supports JSON responses for `initialize`, `tools/list`, and `tools/call`. `GET /mcp` returns 405 after authentication because this adapter has no standalone server event stream.

## Logging

The adapter writes one JSON object per line to stdout, which Lambda forwards to CloudWatch Logs. Every line has `timestamp`, `level`, `service` (`focusware-mcp`), and `event`. Set `MCP_LOG_LEVEL` to `debug`, `info` (default), `warn`, `error`, or `silent`.

| Event | Level | Fields |
| --- | --- | --- |
| `adapter_started` | info | `host`, `port` |
| `request_completed` | info for 2xx/3xx, warn for 4xx, error for 5xx | `request_id`, `http_method`, `route`, `status`, `duration_ms`, `outcome`, and when known `rpc_method`, `tool`, `subject_hash`, `error_name` |
| `tool_call_completed` | info | `request_id`, `tool`, `outcome`, `duration_ms` |
| `tool_call_failed` | warn | `request_id`, `tool`, `outcome`, `error_code`, `error_name`, `duration_ms` |

`request_id` matches the `x-request-id` response header and the header sent to the API server, so one request can be followed across the client, the adapter, and the backend. `outcome` is a fixed reason code such as `handled`, `missing_credentials`, `invalid_token`, `insufficient_scope`, `invalid_tool_arguments`, `origin_not_allowed`, or `host_mismatch`.

Logs never contain bearer tokens, the `Authorization` header, request or response bodies, tool arguments, task or note content, or the user ID. The user appears only as `subject_hash`, a truncated SHA-256 of the token subject. Client-chosen values are not logged verbatim: `route` is `/mcp`, the metadata path, or `other`; `tool` is one of the five tool names or `unknown`; `rpc_method` must match a strict name pattern or is logged as `invalid`. Errors are logged by class name and fixed error code, never by message.

`src/adapter/logger.ts` also redacts every field before writing it: credential-like and content-like field names are replaced with `[REDACTED]`, JWTs and `Bearer`/`Basic` values inside strings are scrubbed, and long strings, large arrays, and deep objects are truncated. When adding a log line, pass only the fields you need; do not rely on the redactor.

Example CloudWatch Logs Insights query for failed requests:

```
fields @timestamp, request_id, outcome, status, tool, duration_ms
| filter service = "focusware-mcp" and event = "request_completed" and status >= 400
| sort @timestamp desc
```

## API server contract

Production task calls are intentionally unavailable until the API server provides a backend delegation or token exchange implementation. The `BackendCredentialProvider` in `src/adapter/backend.ts` must return a **separate** token for the API server; it cannot return the client's MCP resource token. The default provider fails closed. This follows the MCP [access token privilege restriction](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization#access-token-privilege-restriction), which forbids passing the client's token through to an upstream API.

The API server owner must provide an issuer URL, JWKS URL, and signed RS256 JWTs with `iss`, `aud` containing the MCP resource URL, `sub`, `exp`, and a space-delimited `scope` claim. The adapter requires `mcp.tasks.read` for task reads and `mcp.tasks.write` for updates, notes, and project status creation. The separate backend token must identify the user and a durable agent or grant so the API server can authorize assignments independently. Backend routes are `GET /mcp/tasks`, `GET /mcp/tasks/:id`, `PATCH /mcp/tasks/:id/status`, `POST /mcp/tasks/:id/notes`, and `POST /mcp/tasks/project-statuses`.

The current API server routes still use opaque tokens, `tasks:read` / `tasks:write`, an internal service key, and `assigned_mcp_token_id`. Their OAuth guards, agent mapping, and token exchange are owned by the API server workstream. OAuth authorization, PKCE, consent, client registration, and AWS deployment are outside this adapter. End-to-end authorization cannot pass until those integrations exist.
