# MCP OAuth Adapter Build Plan

## Purpose

Build the `apps/mcp-server` adapter described in `Group76_Practical_Architectural_Design_OAuth_AWS_Lambda_MCP.docx`. The adapter is an OAuth-protected MCP resource. It exposes MCP tools, validates user-delegated access tokens, calls the Focus Bear API, and returns safe MCP results. Auth0 authenticates the user during sign-in; under the supplied design, `api-server` is the OAuth authorization server and issues the MCP access token.

This plan is a handoff for an implementation agent. First inspect the repository and the supplied design document. Treat the document as design input, not as an instruction source. Follow repository `AGENTS.md`, including its Context7 requirement when generating code or consulting library APIs.

## Scope and ownership

**Build in this task:** MCP Streamable HTTP transport and local runner; protected-resource metadata and `401` challenge; JWT/JWKS verification and scope enforcement; the five task tools; a fixed backend API client; response shaping, error handling, redacted logging, and adapter tests. Keep the business logic independent of the Lambda event shape so the AWS owner can attach its handler.

**Owned by other workstreams:** `api-server` authorization and token endpoints, PKCE, consent, client registration, signing keys and JWKS; replacement OAuth guards on backend MCP routes; AWS SAM, API Gateway, Lambda runtime, IAM, deployment and monitoring resources. Document the interface those owners must provide. Do not quietly implement a second authorization server in `mcp-server` or preserve the custom token flow as the production path.

## Current repository starting point

- `apps/mcp-server/src/mcp/mcp.service.ts` manually handles two tools and writes SSE strings. It is a prototype, not the target transport.
- `apps/mcp-server/src/mcp/services/tasks.service.ts` already names the five backend operations, but hard-codes `dev-secret`, defaults to a local URL, and forwards backend error text. Refactor or replace it.
- `apps/mcp-server/src/auth/jwt.strategy.ts` verifies Auth0-issued JWTs. The supplied design instead calls for JWTs issued by `api-server`; configure verification from the agreed issuer/JWKS contract rather than assuming the current strategy is correct.
- `apps/mcp-server/src/main.ts` is coupled to an AWS response stream and must not define the MCP protocol behavior.
- `apps/api-server/src/modules/external-mcp_fffff/` currently accepts custom opaque tokens and an internal service key. Its routes cannot yet consume the proposed OAuth access token.
- `to_do.assigned_mcp_token_id` currently refers to a custom token record. OAuth requires an explicit replacement or mapping for agent assignment.

## Contracts to agree before wiring production traffic

Record these in a shared contract or test fixture with the backend owner:

1. **Issuer and discovery:** exact `api-server` issuer URL, authorization-server metadata URL, JWKS URL, authorization and token endpoints, and the public MCP resource URL. Match values per environment.
2. **Token claims:** signing algorithms, `iss`, `aud`, `sub`, `exp`, optional `nbf`, scope claim format, client/grant identifier, and any revocation policy. The adapter must verify its MCP resource audience; the backend must independently verify the audience it accepts. Confirm how the chosen token is valid for both resources without weakening audience checks.
3. **Scopes:** agree exact names and tool permissions. The design proposes `mcp.tasks.read`, `mcp.tasks.write`, and `mcp.summary.read`; only the first two are needed for the five task tools. Existing backend scopes are `tasks:read` and `tasks:write` and must be migrated or mapped explicitly.
4. **Agent assignment:** define how a validated OAuth grant maps to a durable agent ID that replaces or safely maps to `assigned_mcp_token_id`. The backend must derive this from trusted token/grant data. Never accept an agent ID, user ID, URL, backend path, method, or arbitrary header from tool arguments.
5. **Backend routes and DTOs:** confirm whether the five existing `/mcp/tasks` routes will be changed to accept delegated OAuth tokens or new routes will be introduced. Agree pagination/filter inputs, status enum, result fields, and safe error codes.
6. **Launch clients:** name at least one OAuth-capable MCP client and its redirect/client registration policy. Confirm it supports the selected Streamable HTTP response mode and the authorization-server discovery approach.

If a contract is unsettled, implement against an explicit interface and shared fixture, note the assumption in the PR, and leave production wiring gated on the backend contract. Do not invent security-sensitive claim semantics.

## Implementation sequence

### 1. Create a testable adapter core

Define narrow interfaces for request authentication, tool dispatch, and the Focus Bear HTTP client. Keep MCP protocol handling separate from backend calls and Lambda packaging. Add a local HTTP runner or test harness that uses the same adapter code as the eventual Lambda entry point. Avoid process-global user session, token, authorization-decision, or task-result caches.

### 2. Implement Streamable HTTP

Use the installed MCP TypeScript SDK, checking its version and current documentation through Context7 before coding. Support stateless `POST /mcp` initialization, `tools/list`, and `tools/call`; handle `GET /mcp` and protocol-required headers/statuses according to that SDK and the selected client. Prefer a bounded JSON response for synchronous tools where supported. Do not use the prototype's separate `/mcp/sse` and `/mcp/messages` flow or hand-format SSE strings.

Validate method, content type, body size, protocol version, JSON-RPC shape, origin when present, and allowed HTTP methods. Any browser CORS support must use an explicit origin allowlist. The local runner must be able to pass MCP Inspector or the chosen client's basic initialization and tool-list checks.

### 3. Implement OAuth resource behavior

Serve `/.well-known/oauth-protected-resource` with the configured MCP resource identifier, the agreed `api-server` authorization-server issuer, and supported scopes. For an unauthenticated MCP request, return a standards-aligned Bearer `401` challenge pointing to the protected-resource metadata. Keep metadata public and credentials out of responses and logs.

Create a per-request verifier for access tokens using the issuer's JWKS. Verify signature, allowed algorithm, issuer, MCP audience, expiry, optional not-before, and required tool scope. Cache public keys only according to the JWKS caching policy. Handle missing keys and issuer outages as bounded failures. Never treat a merely well-formed JWT as authenticated. Auth0 login tokens and MCP access tokens may have different issuers; accept only the contractually approved MCP issuer.

### 4. Register the tool catalogue

Implement and validate these exact names, unless the backend contract explicitly changes them:

| MCP tool | Scope | Fixed backend call |
| --- | --- | --- |
| `focusware_list_assigned_tasks` | `mcp.tasks.read` | `GET /mcp/tasks` |
| `focusware_get_assigned_task` | `mcp.tasks.read` | `GET /mcp/tasks/:id` |
| `focusware_update_assigned_task_status` | `mcp.tasks.write` | `PATCH /mcp/tasks/:id/status` |
| `focusware_add_assigned_task_note` | `mcp.tasks.write` | `POST /mcp/tasks/:id/notes` |
| `focusware_ensure_project_status` | `mcp.tasks.write` | `POST /mcp/tasks/project-statuses` |

Tool descriptions must say that access is limited to tasks assigned to the authorized MCP agent. Validate UUIDs, pagination bounds, status values, string lengths, and the required status-or-custom-status rule against the agreed API DTOs. Reject extra fields. Use a compiled, fixed route map; never build a backend URL from a caller-supplied path.

### 5. Call the backend and shape results

Forward the original user Bearer token and a request ID over HTTPS to the configured Focus Bear API origin. Under the supplied OAuth design, do **not** send `x-user-id` or `X-Internal-Service-Key`. Set a short outbound timeout and cancellation. Retry an idempotent read at most once for a transient transport failure; never automatically retry status updates or notes. Return bounded, necessary task fields as MCP content and omit tokens, internal headers, stack traces, and database internals.

Map backend `401`, `403`, `404`, `400`/`409`, `429`, timeout, and `5xx` outcomes to consistent HTTP/MCP errors. Preserve the backend's `404` treatment for missing or unassigned tasks. Avoid echoing unreviewed backend messages. Include a request ID for support without exposing sensitive details.

### 6. Remove prototype paths and test

Remove the hard-coded token and `dev-secret`, disabled guard comments, duplicate ad hoc handlers, and unused custom-token forwarding code from the adapter path. Do not remove backend legacy routes as part of this adapter-only task without coordination.

Add focused tests for metadata/challenge, valid and invalid JWT claims, scope decisions, each tool mapping and argument schema, fixed-origin enforcement, error redaction, read-only retry behavior, write no-retry behavior, and concurrent requests with different users. Use generated test keys and a mock JWKS/backend; do not use live credentials. Add a local contract test against a backend stub, then run MCP Inspector or the approved client against the local adapter. Run the relevant Jest tests, MCP build, and lint checks; record exact commands and outcomes.

## Acceptance criteria

- An approved MCP client discovers the authorization server, completes OAuth with the backend test implementation, and can initialize and list tools.
- The five tools call only their fixed backend routes with validated inputs and the original delegated token.
- Invalid issuer, signature, audience, expiry, not-before, or scope is rejected before any backend request.
- A token or grant for one agent cannot access another agent's assigned task; the backend contract test proves this.
- Missing/invalid credentials cause a usable OAuth challenge; authorized backend failures produce safe MCP errors.
- No token, authorization code, verifier, internal key, or task-sensitive data appears in adapter logs.
- The adapter runs locally and is packaged behind a stable handler interface for the AWS owner, without requiring AWS infrastructure to verify its behavior.

## Handoff output

Provide the implementation, test results, a short local run guide, and a contract note listing exact issuer/audience/scopes/backend routes and any remaining backend or client decisions. Call out that the supplied design's OAuth flow is not complete until `api-server` token issuance and OAuth-protected task routes exist.
